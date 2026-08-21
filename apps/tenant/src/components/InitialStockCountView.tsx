import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { getSuggestedUnitsForCategory } from '../data/businessCategories';
import { Wallet, Plus, Trash2, ArrowRight, Info, CheckCircle2, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { SubscriptionBlockedNotice } from './SubscriptionBlockedNotice';
import { InitialStockDraftItem, UnitRelationship, InitialCapitalBasis } from '../types';
import { resolveInitialCapitalValue } from '../utils/calculations';
import { isValidUnitRelationship } from '../lib/unitRelationship';
import { groupRowsByProductName } from '../lib/stockCountPortionGrouping';

interface InitialStockCountViewProps {
  onComplete: () => void;
  onSkip?: () => void;
}

interface CountRowItem {
  id: string;
  productName: string;
  quantity: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  // [Product Memory / UOM — Increment A, Checkpoint 2] UI-only fields,
  // never persisted to InitialStockDraftItem/the autosaved draft (see
  // rowToDraftItem/draftItemToRow, below — neither reads or writes
  // these two fields). Deliberately scoped to a single, optional
  // second unit (a two-level relationship: this row's own `unit` as
  // the top-level/purchase unit, plus one further "selling" unit and
  // how many of it make one `unit`) — not an arbitrary N-level chain
  // builder. This is a genuine, real, working subset of the accepted
  // UOM Specification's data model (Product.unitRelationship already
  // supports N levels — see types.ts), not a different concept; a
  // longer chain remains something the owner can add later via a
  // product-catalog "confirm/edit unit relationship" action (Decision
  // 14), still to be built. Both fields are blank/unused whenever this
  // row's productName already matches an existing product — see
  // isGenuinelyNewProductName below, which gates whether this row's
  // optional unit-relationship section is even shown.
  newProductSellingUnit: string;
  newProductSellingUnitFactor: string;
  // [Sell-unit price conversion] Also UI-only, never persisted — the
  // price the owner actually knows (per newProductSellingUnit, the
  // smaller unit), used to auto-compute `sellingPrice` above (per this
  // row's own `unit`, the buy unit) via newProductSellingUnitFactor.
  // Kept separate from sellingPrice itself so sellingPrice stays the
  // single value every other part of the app already reads — this is
  // purely a convenience input that writes into it, not a parallel
  // source of truth.
  sellingPricePerSellingUnit: string;
}

const rowToDraftItem = (row: CountRowItem): InitialStockDraftItem => ({
  id: row.id,
  productName: row.productName,
  quantity: parseFloat(row.quantity) || 0,
  unit: row.unit,
  costPrice: parseFloat(row.costPrice) || 0,
  sellingPrice: parseFloat(row.sellingPrice) || 0,
  // [Product Memory / UOM — Increment A, Checkpoint 2] Deliberately NOT
  // included — newProductSellingUnit/newProductSellingUnitFactor are
  // UI-only, never part of the persisted draft (see CountRowItem's own
  // comment above). InitialStockDraftItem's shape is completely
  // unchanged by this checkpoint.
});

const draftItemToRow = (item: InitialStockDraftItem): CountRowItem => ({
  id: item.id,
  productName: item.productName,
  quantity: item.quantity ? String(item.quantity) : '',
  unit: item.unit || 'un',
  costPrice: item.costPrice ? String(item.costPrice) : '',
  // Optional on InitialStockDraftItem for backward compatibility — a
  // draft saved before this field existed simply has no selling price
  // to restore, so the field starts blank, same as any other unset row.
  sellingPrice: item.sellingPrice ? String(item.sellingPrice) : '',
  // [Product Memory / UOM — Increment A, Checkpoint 2] Always starts
  // blank on load — this optional sub-config was never persisted
  // (see rowToDraftItem above), so there is nothing to restore.
  newProductSellingUnit: '',
  newProductSellingUnitFactor: '',
  sellingPricePerSellingUnit: '',
});

// [Product Memory / UOM — Increment A, Checkpoint 2] A small, self-
// contained, collapsible optional-input row — deliberately its own
// component (not inlined) so its collapsed/expanded state is
// independent per product row, and so this checkpoint's scope (a
// single optional second unit, per CountRowItem's own comment above)
// stays visibly contained to one place. Starts collapsed, matching this
// screen's existing "calm until needed" pattern (the delete button's
// hover-reveal treatment, immediately above in the JSX this renders
// alongside). Purely a controlled, presentational component — it holds
// no state of its own beyond the collapse toggle, and never calls
// recordStockCount or any context function directly; the parent
// (InitialStockCountView) owns and validates the actual values via
// onChange, exactly like every other row field.
const UnitRelationshipRow: React.FC<{
  purchaseUnit: string;
  sellingUnit: string;
  factor: string;
  sellingPricePerSellingUnit: string;
  onChange: (sellingUnit: string, factor: string) => void;
  onSellingPriceChange: (value: string) => void;
  computedSellingPrice: number | null;
  currencySymbol: string;
}> = ({
  purchaseUnit,
  sellingUnit,
  factor,
  sellingPricePerSellingUnit,
  onChange,
  onSellingPriceChange,
  computedSellingPrice,
  currencySymbol,
}) => {
  const [expanded, setExpanded] = useState(!!(sellingUnit || factor || sellingPricePerSellingUnit));

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-400 hover:text-[#0B1F3A] transition-colors duration-150 py-0.5"
      >
        <ChevronDown className="w-3 h-3" strokeWidth={2.5} />
        <span>Compra em {purchaseUnit || 'un'}, vende numa unidade menor? Calcular preço de venda</span>
      </button>
    );
  }

  return (
    <div className="bg-[var(--muted)] border border-[#E5E7EB] rounded-xl px-3 py-2.5 space-y-2.5">
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-500 hover:text-[#0B1F3A] transition-colors duration-150"
      >
        <ChevronUp className="w-3 h-3" strokeWidth={2.5} />
        <span>Conversão de unidades (opcional)</span>
      </button>
      <div className="flex flex-wrap items-end gap-2.5 text-[12.5px]">
        <span className="text-gray-500 pb-2">
          1 <strong className="text-[#111827]">{purchaseUnit || 'un'}</strong> =
        </span>
        <div>
          <label className="block type-label mb-1">Quantidade</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={factor}
            onChange={(e) => onChange(sellingUnit, e.target.value)}
            placeholder="Ex: 20"
            className="w-24 bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-1.5 text-[13px] font-mono tabular-nums focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
        </div>
        <div>
          <label className="block type-label mb-1">Unidade de venda</label>
          <input
            type="text"
            value={sellingUnit}
            onChange={(e) => onChange(e.target.value, factor)}
            placeholder="Ex: Un"
            className="w-28 bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-1.5 text-[13px] font-mono focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
        </div>
      </div>

      {/* [Sell-unit price conversion] Lets the owner type the price
          they actually know — per the small selling unit, e.g. "130
          MT por Un" — instead of doing the multiplication themselves
          to figure out the equivalent price per purchase unit. Only
          appears once a selling unit and quantity are both entered,
          since the conversion is meaningless without both. */}
      {sellingUnit.trim() && parseFloat(factor) > 0 && (
        <div className="flex flex-wrap items-end gap-2.5 text-[12.5px] pt-1 border-t border-[#E5E7EB]">
          <div>
            <label className="block type-label mb-1">Preço de venda por {sellingUnit.trim()}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={sellingPricePerSellingUnit}
              onChange={(e) => onSellingPriceChange(e.target.value)}
              placeholder="Ex: 6.50"
              className="w-28 bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-1.5 text-[13px] font-mono tabular-nums focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
          </div>
          {computedSellingPrice !== null && (
            <span className="text-gray-500 pb-2">
              → <strong className="text-[#0B1F3A]">{formatCurrency(computedSellingPrice, currencySymbol)}</strong> por{' '}
              {purchaseUnit || 'un'}{' '}
              <span className="text-gray-400">(preenchido automaticamente em "Preço de venda" acima)</span>
            </span>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-400 leading-relaxed">
        Deixe em branco se não quiser configurar agora — pode fazê-lo mais tarde na ficha do produto.
      </p>
    </div>
  );
};

export const InitialStockCountView: React.FC<InitialStockCountViewProps> = ({ onComplete, onSkip }) => {
  const {
    businessCategory,
    currencySymbol,
    recordStockCount,
    hasInitialStockCount,
    initialStockCount,
    initialCapitalValue,
    // [Void & Redo — Implementation Authorization §2 items 5, 8-9]
    voidInitialStockConfirmation,
    initialStockVoidEligibility,
    // [SuperAdmin-Assisted Initial Stock Recovery — Implementation Plan
    // §17; Consumption & Audit Amendment §"Owner UI"] Display-only,
    // never authoritative, exactly like initialStockVoidEligibility
    // above (calculations.ts's own doc comment).
    initialStockAuthorizedRecoveryEligibility,
    initialStockConfirmationChain,
    voidRecords,
    subscriptionBlocksNewRecords,
    initialStockDraft,
    initialStockDraftLoaded,
    saveInitialStockDraft,
    activeBusinessId,
    products,
  } = useApp();
  const suggestedUnits = getSuggestedUnitsForCategory(businessCategory);

  const createEmptyRow = (): CountRowItem => ({
    id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    productName: '',
    quantity: '',
    unit: suggestedUnits[0] || 'un',
    costPrice: '',
    sellingPrice: '',
    newProductSellingUnit: '',
    newProductSellingUnitFactor: '',
    sellingPricePerSellingUnit: '',
  });

  const [date, setDate] = useState(getTodayDateString());
  const [rows, setRows] = useState<CountRowItem[]>([createEmptyRow(), createEmptyRow()]);
  // [Initial Stock Dual-Valuation-Basis — Implementation Authorization,
  // §2 items 2-4] The owner's chosen basis for THIS ENTIRE snapshot —
  // one value, exactly like `date` above (never per-row, matching
  // Invariant I-1). Defaults to 'cost' — both the existing, pre-this-
  // feature behavior AND the correct default for a business that never
  // touches the new control, per BDR-0014 §5.A item 1's prospective-
  // only/backward-compatible resolution. Lives through the exact same
  // reset/load/autosave lifecycle as `date`, below (business-switch
  // reset effect, draft-load effect, autosave effect) — never a
  // separate state machine.
  const [initialCapitalBasis, setInitialCapitalBasis] = useState<InitialCapitalBasis>('cost');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  // [Amendment v1.0] Distinguishes "draft not loaded yet" from "no draft
  // exists" so an existing draft isn't overwritten by the two default
  // empty rows before the listener's first snapshot arrives.
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  // [Draft-loss fix] The autosave effect below is debounced by 800ms so
  // a fast typist doesn't trigger a write per keystroke — but that same
  // debounce is exactly what lets a page reload right after a burst of
  // typing discard whatever hadn't reached the server yet. This flag
  // gates the explicit, non-debounced flush fired the moment the
  // Confirm button is clicked (see handleOpenConfirmStep) so the modal
  // never opens against data that only exists locally.
  const [isFlushingDraft, setIsFlushingDraft] = useState(false);
  const skipNextAutosave = useRef(false);

  // [Void & Redo — Implementation Authorization §2 item 9; FR-5] Set
  // ONLY after a successful Void, to the id of the confirmation just
  // voided — this is what routes handleSubmit below into producing a
  // REDO confirmation instead of an original one. Cleared on a
  // successful reconfirm (via onComplete's own navigation, same as the
  // original-confirmation flow) or on a business switch (the reset
  // effect below).
  const [redoingConfirmationId, setRedoingConfirmationId] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);
  // [FR-19] Explicit secondary confirmation step — the Confirm button's
  // first click reveals this inline panel instead of submitting
  // directly; only the panel's own second, explicit "Sim, confirmar"
  // action actually submits the form.
  const [showConfirmStep, setShowConfirmStep] = useState(false);
  const [showVoidConfirmStep, setShowVoidConfirmStep] = useState(false);
  // [Accidental-confirm hardening] A deliberate extra gate in front of
  // the primary Confirm button: the Owner must tick this box before it
  // becomes clickable at all, on top of the existing FR-19 two-step
  // panel below. Reset on every `rows` change (any edit — add, remove,
  // or typing into a field) so a stray earlier tick can never cover a
  // row the Owner hasn't actually looked at since editing it.
  const [reviewedBeforeConfirm, setReviewedBeforeConfirm] = useState(false);
  useEffect(() => {
    setReviewedBeforeConfirm(false);
  }, [rows]);
  // [Accidental-confirm hardening] Locks background scroll while the
  // confirm modal is open, so the page (and the fixed mobile bottom
  // nav bar sitting on top of it) can't be scrolled or reached behind
  // the dimmed backdrop — the modal is genuinely the only interactive
  // surface on screen at that point, not just the topmost one.
  useEffect(() => {
    if (!showConfirmStep) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showConfirmStep]);

  // [Fix — business-switch draft staleness, Option B] Tracks which
  // business the component's current local state (rows/date/draftLoaded)
  // actually belongs to. InitialStockCountView is never remounted on a
  // business switch — ShopSwitcher lives in a permanent Header sibling
  // of <main>, and this view is selected only by `activeTab`, which
  // doesn't change when the active business does. Without this, the
  // component's own "load once" latch (draftLoaded) would stay true
  // across a switch and never re-arm for the newly active business,
  // regardless of AppContext correctly updating initialStockDraft —
  // meaning Business A's already-loaded rows (or lack of any) would
  // keep being shown under Business B indefinitely.
  const [loadedForBusinessId, setLoadedForBusinessId] = useState<string | null>(activeBusinessId ?? null);

  useEffect(() => {
    if (activeBusinessId === loadedForBusinessId) return;
    // The active business changed under this mounted view. Discard
    // every piece of local state tied to the previous business first —
    // the previous business's draft (loaded or not) must never be
    // shown, autosaved over, or confirmed under the new business's
    // identity. Resetting `rows`/`draftLoaded` here also cancels any
    // in-flight autosave debounce for the old business: the autosave
    // effect below depends on [rows, ...], so this state change runs
    // its cleanup (clearTimeout) before the new render's effects fire,
    // closing the window where a stale debounced write could otherwise
    // land in the new business's stockCountDrafts.
    setLoadedForBusinessId(activeBusinessId ?? null);
    setRows([createEmptyRow(), createEmptyRow()]);
    setDate(getTodayDateString());
    setInitialCapitalBasis('cost');
    setError(null);
    setIsSaving(false);
    setSavedMessage(null);
    setDraftSaveState('idle');
    skipNextAutosave.current = false;
    setDraftLoaded(false); // re-arms the load effect below for the new business
    // [Void & Redo] A new business has no bearing on the previous
    // business's void/redo flow — never carried across a switch.
    setRedoingConfirmationId(null);
    setIsVoiding(false);
    setVoidError(null);
    setShowConfirmStep(false);
    setShowVoidConfirmStep(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId]);

  // Load the existing draft (if any) exactly once, the first time
  // Firestore's real answer becomes available — this is what makes the
  // draft survive refresh/logout/device change: it's read from
  // Firestore, not from anything local.
  //
  // [Fix] Gated on initialStockDraftLoaded, not merely on
  // initialStockDraft !== null. onSnapshot's first callback is always
  // asynchronous, so on every fresh mount initialStockDraft starts as
  // its untouched default (null) before Firestore has answered at all.
  // Without this gate, that default was indistinguishable from "Firestore
  // confirmed no draft exists," so this effect fired immediately, set
  // draftLoaded = true prematurely, and permanently discarded the real
  // snapshot the instant it actually arrived (blocked by the
  // `if (draftLoaded) return;` guard below) — meaning a previously-saved
  // draft would silently fail to load back into the form on remount.
  useEffect(() => {
    if (draftLoaded) return;
    if (loadedForBusinessId !== activeBusinessId) return; // still catching up to a business switch — the reset effect above will re-run this once it settles
    if (!initialStockDraftLoaded) return; // Firestore hasn't answered yet — wait
    if (initialStockDraft === null) {
      // Firestore has now confirmed: no draft exists for this business
      // yet — keep the default two empty rows and today's date.
      setDraftLoaded(true);
      return;
    }
    if (initialStockDraft.items.length > 0) {
      // Defense in depth: if the user has already started typing into
      // the default rows during the (now much smaller, but non-zero)
      // window before Firestore's answer arrived, don't clobber their
      // in-progress input with an older saved draft — their current
      // typing wins, and it will autosave over the old draft shortly.
      const userHasStartedTyping = rows.some((r) => r.productName.trim() || r.quantity || r.costPrice || r.sellingPrice);
      if (!userHasStartedTyping) {
        skipNextAutosave.current = true;
        setRows(initialStockDraft.items.map(draftItemToRow));
        setDate(initialStockDraft.date);
        // [Initial Stock Dual-Valuation-Basis — Implementation
        // Authorization, §2 item 3] Restored alongside rows/date —
        // same "userHasStartedTyping" guard covers this too, since
        // it's part of the same draft snapshot. Absent on a draft
        // saved before this capability existed, or before the owner
        // touched the new control at all — defaults to 'cost',
        // matching this component's own initial state default.
        setInitialCapitalBasis(initialStockDraft.initialCapitalBasis || 'cost');
      }
    }
    setDraftLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStockDraft, initialStockDraftLoaded, loadedForBusinessId, activeBusinessId]);

  // Autosave to the persistent draft on every row/date change, debounced
  // so a fast typist doesn't trigger a write per keystroke. Never runs
  // before the initial load above, and never runs once Initial Stock is
  // already confirmed (nothing left to draft).
  useEffect(() => {
    if (!draftLoaded || hasInitialStockCount || isSaving || savedMessage) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    const hasAnyContent = rows.some((r) => r.productName.trim() || r.quantity || r.costPrice || r.sellingPrice);
    if (!hasAnyContent) return;

    setDraftSaveState('saving');
    const handle = setTimeout(() => {
      saveInitialStockDraft(rows.map(rowToDraftItem), date, initialCapitalBasis)
        .then(() => setDraftSaveState('saved'))
        .catch(() => setDraftSaveState('idle'));
    }, 800);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, date, initialCapitalBasis, draftLoaded, hasInitialStockCount]);

  // [Draft-loss fix, part 2 / instant-save] Shared, reusable flush of
  // the current `rows` straight to Firestore, bypassing the 800ms
  // debounce above entirely. Refs (not state) so callers always see
  // the latest values regardless of when they fire, without
  // re-subscribing anything on every keystroke.
  const latestFlushArgs = useRef({ rows, date, initialCapitalBasis, draftLoaded, hasInitialStockCount });
  latestFlushArgs.current = { rows, date, initialCapitalBasis, draftLoaded, hasInitialStockCount };
  const flushDraftNow = () => {
    const { rows: r, date: d, initialCapitalBasis: basis, draftLoaded: loaded, hasInitialStockCount: confirmed } =
      latestFlushArgs.current;
    if (!loaded || confirmed) return;
    const hasAnyContent = r.some((row) => row.productName.trim() || row.quantity || row.costPrice || row.sellingPrice);
    if (!hasAnyContent) return;
    setDraftSaveState('saving');
    saveInitialStockDraft(r.map(rowToDraftItem), d, basis)
      .then(() => setDraftSaveState('saved'))
      .catch(() => setDraftSaveState('idle'));
  };

  // [Draft-loss fix, part 2] The 800ms debounce above is exactly what
  // let a refresh or tab close interrupt a pending save and discard
  // whatever hadn't reached Firestore yet — this happened for real:
  // typed edits were lost when the page was reloaded before the
  // debounce timer fired. handleOpenConfirmStep already closes this
  // gap for the "click Confirm" path; this closes it for the general
  // case of the page being reloaded, closed, or navigated away from at
  // any moment while mid-edit, not just at the Confirm click.
  //
  // Fired on 'visibilitychange' (tab hidden — covers switching tabs,
  // minimizing, and is the most reliable signal on mobile) and
  // 'pagehide' (covers an actual reload/close/navigation) rather than
  // 'beforeunload', which mobile Safari and some browsers don't
  // reliably fire at all. This is a best-effort fire-and-forget write
  // — the browser gives no guarantee it completes once the page is
  // actually gone — but it closes the large, common window (typing,
  // then immediately refreshing) that caused the loss here; it does
  // not claim to make loss impossible in every conceivable case (e.g.
  // the device losing power mid-write).
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushDraftNow();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', flushDraftNow);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', flushDraftNow);
    };
  }, []);

  const updateRow = (id: string, fields: Partial<CountRowItem>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...fields } : row)));
  };

  const handleAddRow = () => setRows((prev) => [...prev, createEmptyRow()]);

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  // [Grouped Initial Stock UX] Adds a new portion row PRE-FILLED with
  // an existing product group's own name — the only behavioral
  // difference from handleAddRow above, which always creates a wholly
  // blank row. Everything else about the new row (quantity, unit,
  // costPrice, sellingPrice, the two UI-only unit-relationship fields)
  // starts blank, exactly like any other new row. Because grouping
  // (groupRowsByProductName, below) is computed fresh from `rows` on
  // every render, this new row is picked up into the SAME group
  // automatically — there is no separate "group" state to update.
  const handleAddPortion = (groupDisplayName: string) => {
    setRows((prev) => [...prev, { ...createEmptyRow(), productName: groupDisplayName }]);
  };

  // [Grouped Initial Stock UX] Renames every row currently in the group
  // keyed by `groupKey` (a trimmed, lowercased product name — see
  // groupRowsByProductName) to `newName`, in one update. This is the
  // one genuinely new multi-row operation this checkpoint introduces —
  // every other handler here still touches exactly one row by its own
  // id, matching this file's existing pattern. Still a plain
  // client-side array transform over the SAME flat `rows` state; it
  // writes nothing to Firestore directly (autosave picks up the result
  // exactly as it already does for any other edit) and does not
  // require `groupKey` to still match `newName` afterward — the group
  // simply re-forms under the new name on the next render, or merges
  // into an existing group if `newName` now matches one, which is
  // correct, intended behavior (typing the same name onto a solo row
  // makes it a portion of that existing product, exactly as it would
  // if the owner had typed a matching name into any row today).
  const handleRenameGroup = (groupKey: string, newName: string) => {
    if (!groupKey) return; // a blank/solo group has no shared name to rename — its own input already handles this via updateRow
    setRows((prev) =>
      prev.map((row) => (row.productName.trim().toLowerCase() === groupKey ? { ...row, productName: newName } : row))
    );
  };

  // [Grouped Initial Stock UX] Removes every row belonging to one
  // group at once — the "remove entire product" action, distinct from
  // handleRemoveRow's existing "remove one portion" behavior, which
  // remains completely unchanged and is still what each individual
  // portion's own delete button calls. Takes the group's own row ids
  // directly (not a name match) specifically because a blank-name
  // group's key ('') is shared by every not-yet-named row — matching
  // by name alone would incorrectly remove every blank row in the
  // form, not just this one group's single row. Mirrors
  // handleRemoveRow's existing "never remove the very last row"
  // guarantee: refuses (no-op) if removing this whole group would
  // leave zero rows, rather than ever leaving the form with nothing to
  // edit.
  const handleRemoveGroup = (rowIds: string[]) => {
    const idsToRemove = new Set(rowIds);
    setRows((prev) => {
      const remaining = prev.filter((row) => !idsToRemove.has(row.id));
      if (remaining.length === 0) return prev;
      return remaining;
    });
  };

  // [Product Memory / UOM — Increment A, Checkpoint 2] "Genuinely new"
  // means no existing Product matches this name (case-insensitive) —
  // the exact same lookup addStockBatch/recordStockCount themselves use
  // to decide whether to create a new Product document (AppContext.tsx).
  // A row whose name already matches an existing product NEVER shows
  // the optional unit-relationship section below, regardless of
  // whether that existing product has confirmed Product Memory yet —
  // reconfiguring (or configuring for the first time) an EXISTING
  // product is Decision 14's separate, explicit-owner-action path
  // (confirmProductUnitRelationship, Checkpoint 1), not something this
  // screen silently offers or infers. This also means Recognition
  // (proposeUnitRelationshipRecognition) is correctly never invoked for
  // an already-known product, matching UOM Specification §3 step 5's
  // "never re-run" rule.
  const isGenuinelyNewProductName = (name: string): boolean => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return false;
    return !products.some((p) => p.name.toLowerCase() === trimmed);
  };

  const totalCapital = rows.reduce((acc, row) => {
    const q = parseFloat(row.quantity) || 0;
    const c = parseFloat(row.costPrice) || 0;
    return acc + q * c;
  }, 0);

  // [Grouped Initial Stock UX] Purely a render-layer reshaping of the
  // SAME flat `rows` state into product groups — see
  // groupRowsByProductName's own header comment. Computed fresh every
  // render, exactly like B5's own portionLabels computation this
  // replaces. Feeds NOTHING into totalCapital above,
  // InitialStockDraftItem, or any Firestore write: handleSubmit, below,
  // still iterates the flat `rows` array directly, never `rowGroups`,
  // so the persisted shape is completely unaffected by how this screen
  // currently chooses to visually group rows for editing.
  const rowGroups = groupRowsByProductName(rows);

  // [Draft-loss fix] Fired by the "Confirmar Capital Inicial" /
  // "Confirmar Nova Contagem" click, before the confirm modal opens.
  // Forces an immediate, non-debounced write of the current `rows` to
  // the persistent draft — the exact same write the debounced autosave
  // effect above would eventually make, just not left to a timer that
  // a page reload could interrupt. If it fails (e.g. no connection),
  // the modal does not open, and the reason is shown inline instead of
  // silently risking data that was never actually persisted.
  const handleOpenConfirmStep = async () => {
    setError(null);
    const hasAnyContent = rows.some((r) => r.productName.trim() || r.quantity || r.costPrice || r.sellingPrice);
    if (hasAnyContent && !hasInitialStockCount) {
      setIsFlushingDraft(true);
      setDraftSaveState('saving');
      try {
        await saveInitialStockDraft(rows.map(rowToDraftItem), date, initialCapitalBasis);
        setDraftSaveState('saved');
      } catch {
        setIsFlushingDraft(false);
        setError('Não foi possível guardar o rascunho antes de confirmar. Verifique a sua ligação e tente novamente.');
        return;
      }
      setIsFlushingDraft(false);
    }
    setShowConfirmStep(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // [FR-19] The explicit secondary confirmation step: a first
    // "Confirmar Capital Inicial" click reveals the inline panel below
    // (showConfirmStep) instead of submitting — only that panel's own
    // second, explicit action reaches this point with showConfirmStep
    // already true. A submit reaching here with it still false (e.g. a
    // stray Enter-key submit from within the product grid) is treated
    // as the same first click, not a bypass.
    if (!showConfirmStep) {
      setShowConfirmStep(true);
      return;
    }

    // [Accidental-confirm hardening] Checked here, inside the actual
    // submit handler, rather than only via the button's `disabled`
    // attribute — a disabled button doesn't fire a click event at all,
    // so gating solely on `disabled` means an unticked checkbox makes
    // the button silently do nothing with no error, no feedback, and
    // no obvious explanation. Checking it here means "Sim, confirmar"
    // always responds to a click: either it proceeds, or it explains
    // exactly what's missing.
    if (!reviewedBeforeConfirm) {
      setError('Marque a confirmação de revisão antes de continuar.');
      return;
    }

    // [Void & Redo — Implementation Authorization §2 items 5-6; Rule 8
    // Finding F2] This guard blocks an accidental SECOND ORIGINAL
    // confirmation — it must not fire while producing a legitimate
    // redo (redoingConfirmationId set). By this point hasInitialStockCount
    // is already false for a genuine post-void state (Finding F1), but
    // the explicit check here is kept for the same intention-revealing
    // reason AppContext.tsx's own guard is.
    if (hasInitialStockCount && !redoingConfirmationId) {
      setError('O Capital Inicial já foi definido anteriormente e não pode ser alterado.');
      return;
    }

    const itemsToSave = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const trimmedName = row.productName.trim();
      if (!trimmedName) continue;

      // A row can have a product name and quantity typed in while its
      // price fields are still blank — e.g. mid-edit, or left behind by
      // an accidental confirm click. parseFloat('') is NaN, and NaN||0
      // silently becomes 0, so without this explicit "was anything
      // actually typed here" check a blank price field would be
      // indistinguishable from a deliberate "0" and would be written
      // into the permanent Capital Inicial record as if the product
      // genuinely cost/sold for nothing. Checking the raw string (not
      // the parsed number) is what lets a deliberate "0" through while
      // still catching a field nobody touched.
      if (row.costPrice.trim() === '') {
        setError(`Introduza um preço de custo para "${trimmedName}" (ou 0, se for mesmo gratuito).`);
        return;
      }
      if (row.sellingPrice.trim() === '') {
        setError(`Introduza um preço de venda para "${trimmedName}" (ou 0, se não aplicável).`);
        return;
      }

      const numQty = parseFloat(row.quantity) || 0;
      const numCost = parseFloat(row.costPrice) || 0;
      const numSelling = parseFloat(row.sellingPrice) || 0;

      if (numQty <= 0) {
        setError(`Introduza uma quantidade maior que zero para "${trimmedName}".`);
        return;
      }
      if (numCost < 0) {
        setError(`Introduza um custo válido para "${trimmedName}".`);
        return;
      }
      if (numSelling < 0) {
        setError(`Introduza um preço de venda válido para "${trimmedName}".`);
        return;
      }

      // [Product Memory / UOM — Increment A, Checkpoint 2] Built ONLY
      // when this row's product is genuinely new AND the owner actually
      // filled in the optional second-unit fields — an empty/untouched
      // section contributes nothing (no unitRelationship key at all),
      // which is exactly the same "no confirmed configuration, warn
      // later, never block" state a product created without this
      // section already has today (BDR-0012 §5.A Item 6). PURCHASE
      // FACTS ARE NEVER TOUCHED BY THIS: row.unit, row.quantity, and
      // row.costPrice above are read completely unchanged, before and
      // after this block — this only ever ADDS an optional
      // unitRelationship candidate for a brand-new product to the item
      // being sent to recordStockCount; it never rewrites anything
      // already collected above.
      let unitRelationship: UnitRelationship | undefined;
      if (isGenuinelyNewProductName(trimmedName)) {
        const sellingUnit = row.newProductSellingUnit.trim();
        const factor = parseFloat(row.newProductSellingUnitFactor);
        if (sellingUnit && Number.isFinite(factor) && factor > 0) {
          const candidate: UnitRelationship = {
            units: [
              { unit: row.unit || 'un', factorFromPrevious: 0 },
              { unit: sellingUnit, factorFromPrevious: factor },
            ],
            sellingUnit,
            confirmedAt: new Date().toISOString(),
          };
          // Re-validated here, at the actual point of use — never
          // trusted merely because the UI fields were non-empty
          // (POL-0005's threshold is the single source of truth,
          // enforced identically to every other write path from
          // Checkpoint 1).
          if (isValidUnitRelationship(candidate)) {
            unitRelationship = candidate;
          }
        }
      }

      itemsToSave.push({
        productName: trimmedName,
        quantity: numQty,
        unit: row.unit || 'un',
        costPrice: numCost,
        sellingPrice: numSelling,
        ...(unitRelationship ? { unitRelationship } : {}),
      });
    }

    if (itemsToSave.length === 0) {
      setError('Adicione pelo menos um produto com quantidade e custo.');
      return;
    }

    setIsSaving(true);
    try {
      await recordStockCount({
        type: 'initial',
        date,
        items: itemsToSave,
        initialCapitalBasis,
        // [Void & Redo — Implementation Authorization §2 items 5-6]
        // undefined for an original confirmation (the overwhelmingly
        // common case, and every call site before this feature),
        // present only mid-redo.
        ...(redoingConfirmationId ? { redoesConfirmationId: redoingConfirmationId } : {}),
      });
      setSavedMessage('Capital Inicial registado com sucesso!');
      setRedoingConfirmationId(null);
      setTimeout(() => onComplete(), 1200);
    } catch (err: any) {
      setError(err.message || 'Erro ao registar o Capital Inicial.');
      setShowConfirmStep(false);
    } finally {
      setIsSaving(false);
    }
  };

  // [Void & Redo — Implementation Authorization §2 item 5; Rule 8
  // Findings A1, D1] Triggers the Void step. Authorization is entirely
  // firestore.rules' — a rejection here (window elapsed, Confirmation
  // #4, non-Owner, or any other precondition failure) surfaces as a
  // generic permission error, since the rules layer gives no more
  // specific reason than a denial; the message below is written to
  // cover the general case, not to claim a specific cause this
  // function cannot actually distinguish.
  const handleVoidAndRedo = async () => {
    if (!showVoidConfirmStep) {
      setShowVoidConfirmStep(true);
      return;
    }
    setVoidError(null);
    setIsVoiding(true);
    try {
      const voidedId = initialStockCount!.id;
      await voidInitialStockConfirmation();
      setRedoingConfirmationId(voidedId);
      // [Void & Redo] Re-arms the draft-load effect (line ~254) so the
      // reconstructed draft voidInitialStockConfirmation just wrote
      // into context (initialStockDraft) is picked up into `rows`,
      // exactly like loading any other draft — this component never
      // reads initialStockDraft directly outside that one effect.
      setDraftLoaded(false);
      setShowVoidConfirmStep(false);
      setShowConfirmStep(false);
      setError(null);
    } catch (err: any) {
      setVoidError(err.message || 'Não foi possível anular esta confirmação — a janela de recuperação pode já ter expirado.');
      setShowVoidConfirmStep(false);
    } finally {
      setIsVoiding(false);
    }
  };

  if (savedMessage) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex flex-col items-center text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" strokeWidth={2.25} />
        </div>
        <h2 className="type-title">{savedMessage}</h2>
        <p className="text-sm text-gray-500">
          Capital Inicial:{' '}
          <span className="font-display font-semibold text-[#0B1F3A] tabular-nums">
            {formatCurrency(totalCapital, currencySymbol)}
          </span>
        </p>
      </div>
    );
  }

  // [Void & Redo — Implementation Authorization §2 items 8-9; FR-9,
  // FR-10, FR-21] Once there's an active confirmation and we are not
  // mid-redo-editing, this screen — not the blank form — is what the
  // Owner sees on this tab from now on. Rendered regardless of
  // subscriptionBlocksNewRecords: viewing the confirmed total and
  // history never required a subscription, and the recovery action
  // itself (below) is exactly what Option A exists to keep available
  // even while blocked (Rule 8 Finding K1) — firestore.rules remains
  // the actual enforcement point either way.
  if (hasInitialStockCount && !redoingConfirmationId) {
    const formatMsRemaining = (ms: number): string => {
      const totalSeconds = Math.max(0, Math.floor(ms / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
      <div className="max-w-2xl mx-auto pb-12 space-y-4">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-5 sm:p-8 space-y-5">
          <div className="flex items-center gap-3 pb-5 border-b border-[#E5E7EB]">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="type-title">Capital Inicial Confirmado</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Este é o ponto de partida contra o qual o crescimento de capital do seu negócio é medido.
              </p>
            </div>
          </div>

          <div className="card-dark-gradient rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" strokeWidth={2.25} />
              <span className="font-semibold text-white/70 text-[13px]">Capital Inicial Total</span>
            </div>
            <span className="font-display font-semibold text-[22px] sm:text-[24px] text-[#D4AF37] tabular-nums leading-none">
              {formatCurrency(initialCapitalValue, currencySymbol)}
            </span>
          </div>

          {voidError && (
            <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] font-medium">
              {voidError}
            </div>
          )}

          {/* [FR-21] Recovery-window visibility — the Owner must be
              able to see, throughout the window, that recovery is
              currently available. Nothing renders here at all once the
              window elapses or Confirmation #4's ceiling is reached
              (initialStockVoidEligibility.eligible is false either
              way — the two cases are deliberately indistinguishable to
              the Owner, matching FR-16's "unconditional, no soft
              warning state" framing: there is no partial-eligibility
              messaging to design here). */}
          {initialStockVoidEligibility.eligible && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 space-y-3">
              <div className="flex items-start gap-2.5">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-[3px]" strokeWidth={2.25} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-amber-800">
                    Janela de recuperação ativa — {formatMsRemaining(initialStockVoidEligibility.msRemaining)} restantes
                  </p>
                  <p className="text-[11.5px] text-amber-700 mt-1 leading-relaxed">
                    Confirmou por engano? Pode anular esta confirmação e refazê-la, mas apenas dentro desta janela de 12
                    horas a partir do momento em que confirmou. A confirmação original fica permanentemente registada
                    no histórico, marcada como anulada — nunca é apagada.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowVoidConfirmStep(true)}
                disabled={isVoiding}
                className="w-full py-2.5 px-3 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/50 text-amber-800 font-bold text-[12.5px] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Anular e Refazer Capital Inicial
              </button>
            </div>
          )}

          {/* [SuperAdmin-Assisted Initial Stock Recovery — Implementation
              Plan §17; Supplementary Implementation Authorization,
              signed 2026-08-21] Distinct panel for the SuperAdmin-
              authorized 48-hour window — rendered ONLY when the
              ordinary 12-hour window is NOT already eligible (the two
              panels are deliberately mutually exclusive; the ordinary
              panel above already covers the case where both happen to
              be true, since it needs no SuperAdmin involvement).
              Visually distinct (indigo, not amber) so the Owner never
              confuses "your own recovery window" with "a support-
              granted one," per explicit UI requirement. Reuses the
              EXACT same handleVoidAndRedo/showVoidConfirmStep/isVoiding
              flow as the ordinary panel above — this is not a second
              recovery workflow, only a second eligibility source
              feeding the same button. */}
          {!initialStockVoidEligibility.eligible && initialStockAuthorizedRecoveryEligibility.eligible && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3.5 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-[3px]" strokeWidth={2.25} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-indigo-800">
                    Recuperação autorizada pelo suporte — {formatMsRemaining(initialStockAuthorizedRecoveryEligibility.msRemaining)} restantes
                  </p>
                  <p className="text-[11.5px] text-indigo-700 mt-1 leading-relaxed">
                    A sua janela normal de 12 horas já não está disponível para esta confirmação, mas o suporte
                    autorizou uma recuperação excecional, válida por 48 horas a partir da autorização. A confirmação
                    original fica permanentemente registada no histórico, marcada como anulada — nunca é apagada. É o
                    dono do negócio, e apenas o dono, que executa esta recuperação.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowVoidConfirmStep(true)}
                disabled={isVoiding}
                className="w-full py-2.5 px-3 rounded-xl border border-indigo-300 bg-white hover:bg-indigo-100/50 text-indigo-800 font-bold text-[12.5px] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Anular e Refazer Capital Inicial (autorizado pelo suporte)
              </button>
            </div>
          )}

          {/* [Accidental-confirm hardening] One shared modal for both
              void triggers above — they're mutually exclusive
              (initialStockVoidEligibility.eligible vs the SuperAdmin-
              authorized fallback), so only one variant's copy/color
              ever applies at a time, same as the two trigger panels
              themselves. Detached from the scrollable page for the
              same reason the Capital Inicial confirm modal is: this
              is a permanent, hard-to-undo action, and it shouldn't be
              reachable by a stray scroll/tap or a mis-tap near the
              fixed mobile bottom nav. */}
          {showVoidConfirmStep && (
            <div
              className="fixed inset-0 z-50 bg-[#0B1F3A]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
              onClick={() => !isVoiding && setShowVoidConfirmStep(false)}
            >
              <div
                className={`w-full max-w-sm bg-white rounded-2xl shadow-2xl border-2 px-5 py-5 space-y-4 ${
                  initialStockVoidEligibility.eligible ? 'border-amber-300' : 'border-indigo-300'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <p
                  className={`text-[13px] font-semibold ${
                    initialStockVoidEligibility.eligible ? 'text-amber-800' : 'text-indigo-800'
                  }`}
                >
                  Tem a certeza? Esta ação anula permanentemente a confirmação atual.
                </p>
                <p className="text-[12px] leading-relaxed text-gray-500">
                  A confirmação original fica registada no histórico, marcada como anulada — nunca é apagada. Depois
                  de anular, terá de preencher e confirmar uma nova contagem para ter um Capital Inicial ativo.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVoidConfirmStep(false)}
                    disabled={isVoiding}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-[#E5E7EB] bg-white text-gray-600 hover:bg-gray-50 font-bold text-[12.5px] transition-all duration-150"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleVoidAndRedo}
                    disabled={isVoiding}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-white font-bold text-[12.5px] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${
                      initialStockVoidEligibility.eligible
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {isVoiding ? 'A anular...' : 'Sim, anular e refazer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* [Product Architect direction — UX-quality pass, this
              session] Three genuinely distinct states, never
              conflated: Confirmation #4 (absolute, no path, ever —
              never suggests support can help); otherwise-blocked but
              still recoverable via SuperAdmin assistance (reassuring,
              accurate — never implies SuperAdmin edits Initial Stock
              directly, always says the Owner performs it); this panel
              only ever appears when BOTH eligibility windows are
              closed, exactly as before. */}
          {!initialStockVoidEligibility.eligible && !initialStockAuthorizedRecoveryEligibility.eligible && (
            (initialStockCount?.chainPosition ?? 1) === 4 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-[3px]" strokeWidth={2.25} />
                <p className="text-[11.5px] text-gray-500 leading-relaxed">
                  Esta confirmação atingiu o limite máximo de recuperações (Confirmação #4) e já não pode ser anulada
                  ou recuperada — nem mesmo com autorização do suporte. Este limite existe para proteger a integridade
                  do histórico do seu Capital Inicial e não pode ser contornado.
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-[3px]" strokeWidth={2.25} />
                <p className="text-[11.5px] text-gray-500 leading-relaxed">
                  Confirmou o Capital Inicial por engano e a sua janela normal de 12 horas já não está disponível?
                  Contacte o suporte — em casos legítimos, é possível autorizar uma recuperação excecional, válida por
                  48 horas. O suporte apenas autoriza; é sempre o dono do negócio quem executa a recuperação, aqui
                  nesta mesma página.
                </p>
              </div>
            )
          )}

          {/* [FR-9, FR-10] History — every confirmation event this
              business has ever had, up to 4, each unambiguously marked
              voided or active. */}
          {initialStockConfirmationChain.length > 1 && (
            <div className="space-y-2">
              <p className="type-label text-gray-400">Histórico de Confirmações</p>
              <div className="space-y-1.5">
                {initialStockConfirmationChain.map((count) => {
                  const isVoided = voidRecords.some((v) => v.voidedConfirmationId === count.id);
                  return (
                    <div
                      key={count.id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--muted)] border border-[#E5E7EB]"
                    >
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-semibold text-[#0B1F3A]">
                          Confirmação #{count.chainPosition ?? 1}
                          {count.date ? ` — ${count.date}` : ''}
                        </p>
                        <p className="text-[11px] text-gray-500 tabular-nums">
                          {formatCurrency(resolveInitialCapitalValue(count), currencySymbol)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                          isVoided ? 'bg-gray-200 text-gray-500' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isVoided ? 'ANULADA' : 'ATIVA'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Shared input treatment — minimal, rounded, gold focus glow. Used by
  // every field in the product grid so the whole table reads as one
  // consistent system instead of per-field styling.
  const fieldClass =
    'w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[13px] text-[#111827] placeholder-gray-400 ' +
    'transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20';
  const fieldLabelClass = 'block type-label mb-1';
  // Column widths: Nome gets the most room, numeric fields stay tight,
  // last column is just wide enough for the hover-revealed delete icon.
  const rowGridClass = 'grid grid-cols-2 sm:grid-cols-[minmax(0,2fr)_84px_76px_112px_112px_120px_28px] gap-x-2.5 gap-y-2.5 sm:items-end';

  // [Grouped Initial Stock UX] Renders the shared quantity/unit/cost/
  // selling/total/delete field set for exactly ONE row — factored out
  // so both a solo (one-portion) product's inline row and a multi-
  // portion product's nested portion rows render the identical field
  // markup, wired to the identical updateRow(row.id, ...) calls this
  // file already used for every row before this checkpoint. Purely a
  // local render helper — no state of its own, no different behavior
  // than the original inline JSX it replaces (byte-for-byte the same
  // update calls, same formatCurrency computation, same delete-button
  // treatment), just reusable across the two rendering contexts a
  // grouped layout now has.
  const renderPortionFields = (
    row: CountRowItem,
    opts: { onDelete?: () => void; deleteAriaLabel: string }
  ) => (
    <>
      <div>
        <label className={`${fieldLabelClass} sm:hidden`}>Qtd</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={row.quantity}
          onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
          className={`${fieldClass} font-mono tabular-nums`}
        />
      </div>

      <div>
        <label className={`${fieldLabelClass} sm:hidden`}>Unid</label>
        <input
          type="text"
          value={row.unit}
          onChange={(e) => updateRow(row.id, { unit: e.target.value })}
          className={`${fieldClass} font-mono text-center`}
        />
      </div>

      <div>
        <label className={`${fieldLabelClass} sm:hidden`}>Custo/Un ({currencySymbol})</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={row.costPrice}
          onChange={(e) => updateRow(row.id, { costPrice: e.target.value })}
          className={`${fieldClass} font-mono tabular-nums`}
        />
      </div>

      <div>
        <label className={`${fieldLabelClass} sm:hidden`}>Venda/Un ({currencySymbol})</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={row.sellingPrice}
          onChange={(e) => updateRow(row.id, { sellingPrice: e.target.value })}
          className={`${fieldClass} font-mono tabular-nums`}
        />
      </div>

      <div className="flex items-end gap-1.5">
        <div className="flex-1 min-w-0">
          <label className={`${fieldLabelClass} sm:hidden`}>Valor Total</label>
          <div className="w-full bg-[#0B1F3A]/[0.04] rounded-[10px] px-2.5 py-2 text-[#0B1F3A] text-[13px] type-number tabular-nums truncate">
            {formatCurrency((parseFloat(row.quantity) || 0) * (parseFloat(row.costPrice) || 0), currencySymbol)}
          </div>
        </div>
        {/* Delete — only fully visible on row hover/focus, keeping
            the table calm until the user needs the action. */}
        {opts.onDelete && (
          <button
            type="button"
            onClick={opts.onDelete}
            aria-label={opts.deleteAriaLabel}
            className="shrink-0 p-1.5 mb-[1px] rounded-lg text-gray-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </>
  );

  // [Void & Redo — Implementation Authorization §2 item 7; Rule 8
  // Finding K1/Option A] Skipped while mid-redo-editing — the whole
  // point of the exemption is that a subscription-blocked business can
  // still complete a legitimate recovery. This does not grant any
  // OTHER new-record write while blocked; only the void/redo write
  // paths are exempt at the rules layer, and this UI gate change
  // affects visibility only.
  if (subscriptionBlocksNewRecords && !redoingConfirmationId) {
    return <SubscriptionBlockedNotice />;
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-5 sm:p-8 space-y-6">
        {/* Header — compact, single line, no visual noise */}
        <div className="flex items-center gap-3 pb-5 border-b border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
            <Wallet className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="type-title">
              Contagem de Stock Inicial <span className="text-gray-400 font-semibold">(Capital Inicial)</span>
            </h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Registe tudo o que já possui no seu negócio — isto NÃO é uma compra.
            </p>
          </div>
          {draftSaveState !== 'idle' && (
            <span className="text-[11px] text-gray-400 shrink-0 font-medium">
              {draftSaveState === 'saving' ? 'A guardar rascunho…' : 'Rascunho guardado'}
            </span>
          )}
        </div>

        {/* Info box — informs quietly, never dominates */}
        <div className="bg-[var(--muted)] border border-[#E5E7EB] rounded-xl px-4 py-3.5 flex items-start gap-2.5">
          <Info className="w-3.5 h-3.5 text-[#0B1F3A]/60 shrink-0 mt-[3px]" strokeWidth={2.25} />
          <p className="text-[12px] leading-relaxed text-gray-600">
            Esta contagem estabelece o seu <strong className="text-[#111827] font-semibold">Capital Inicial do Negócio</strong> — o
            ponto de partida contra o qual todo o crescimento (ou perda) de capital será medido a partir de agora. Ao
            contrário de uma compra de stock (lote), esta contagem{' '}
            <strong className="text-[#111827] font-semibold">não cria um lote de compra</strong>. Pode editar livremente
            antes de confirmar — o seu progresso fica guardado. Só pode ser <strong className="text-[#111827] font-semibold">confirmada</strong> uma vez.
          </p>
        </div>

        {error && (
          <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="max-w-[220px]">
            <label className={fieldLabelClass}>Data da Contagem</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${fieldClass} font-mono tabular-nums py-2`}
            />
          </div>

          {/* [Initial Stock Dual-Valuation-Basis — Implementation
              Authorization, §2 items 2, 4] Presented exactly ONCE, for
              the entire snapshot — never per product, never per
              portion (Specification FR-2, Invariant I-1). This choice
              becomes permanently locked the moment Initial Stock is
              confirmed (FR-4) — after that, nothing in this app can
              change it. Defaults to Custo (cost), matching this
              component's own state default and the backward-
              compatible resolution every business without an explicit
              selection already gets. */}
          <div>
            <label className={fieldLabelClass}>Base de Valorização do Capital Inicial</label>
            <p className="text-[11.5px] text-gray-500 mb-2 leading-relaxed">
              Escolha uma vez, para toda a contagem. Depois de confirmar o Capital Inicial, esta escolha não pode ser alterada.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInitialCapitalBasis('cost')}
                aria-pressed={initialCapitalBasis === 'cost'}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 ${
                  initialCapitalBasis === 'cost'
                    ? 'border-[#D4AF37] bg-[#D4AF37]/[0.06]'
                    : 'border-[#E5E7EB] hover:border-[#D4AF37]/40'
                }`}
              >
                <span className="block text-[13px] font-bold text-[#111827]">Custo</span>
                <span className="block text-[11px] text-gray-500 mt-0.5">Valor investido (o que pagou)</span>
              </button>
              <button
                type="button"
                onClick={() => setInitialCapitalBasis('selling')}
                aria-pressed={initialCapitalBasis === 'selling'}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 ${
                  initialCapitalBasis === 'selling'
                    ? 'border-[#D4AF37] bg-[#D4AF37]/[0.06]'
                    : 'border-[#E5E7EB] hover:border-[#D4AF37]/40'
                }`}
              >
                <span className="block text-[13px] font-bold text-[#111827]">Venda</span>
                <span className="block text-[11px] text-gray-500 mt-0.5">Valor de venda (o que espera vender)</span>
              </button>
            </div>
          </div>

          {/* Product grid — column header shown from sm+, rows collapse to
              stacked pairs on mobile with inline labels retained.
              [Grouped Initial Stock UX] Header remains identical to
              before; the row content underneath is now grouped by
              product instead of listing every product name repeatedly
              — see rowGroups, above, and its own header comment for
              why this is a pure render-layer change over the same flat
              `rows` state. */}
          <div>
            <div className={`hidden sm:grid ${rowGridClass.replace('sm:items-end', '')} pb-2 mb-1 border-b border-[#E5E7EB]`}>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Nome</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Qtd</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Unid</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Custo/Un</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Venda/Un</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Valor Total</span>
              <span />
            </div>

            <div
              className="space-y-2.5"
              // [Instant-save] Fires the moment focus leaves any field
              // in the product list — React's onBlur bubbles (via
              // native focusout, React 17+), so one listener here
              // covers every input/select in every row without wiring
              // each one individually. Triggers the same non-debounced
              // flushDraftNow used by the tab-hide/reload safety net
              // above, so a finished field is saved in well under a
              // second rather than waiting out the full 800ms
              // inactivity debounce.
              onBlur={flushDraftNow}
            >
              {rowGroups.map((group) => {
                const firstRow = group.rows[0];
                const isSolo = group.rows.length === 1;
                // [Sell-unit price conversion] Available for any named
                // product, known or new — the conversion this section
                // now also drives (an auto-computed sellingPrice, see
                // handleUnitRelationshipChange below) is useful
                // regardless of whether the product already exists in
                // the catalog. isGenuinelyNewProductName remains
                // unchanged and is still what gates whether a
                // unitRelationship candidate gets persisted to Product
                // Memory at submit time (handleSubmit, below) — that
                // persistence rule is untouched by this.
                const showUnitRelationshipSection = group.displayName.trim() !== '';
                const groupTotal = group.rows.reduce(
                  (acc, r) => acc + (parseFloat(r.quantity) || 0) * (parseFloat(r.costPrice) || 0),
                  0
                );

                return (
                  <div
                    key={firstRow.id}
                    className="rounded-xl border border-transparent hover:border-[#E5E7EB] transition-colors duration-150 -mx-2.5 px-2.5 py-1.5"
                  >
                    {/* Group header — the product name field appears
                        EXACTLY ONCE here, shared by every portion below
                        it, whether there is one portion (rendered
                        inline on this same row, exactly like the old
                        flat layout) or several (rendered as a summary
                        row with the group's combined total and a
                        "remove whole product" action). */}
                    <div className={`group ${rowGridClass}`}>
                      <div className="col-span-2 sm:col-span-1">
                        <label className={`${fieldLabelClass} sm:hidden`}>Nome</label>
                        <input
                          type="text"
                          placeholder="Ex: Arroz"
                          value={group.displayName}
                          onChange={(e) =>
                            group.key
                              ? handleRenameGroup(group.key, e.target.value)
                              : updateRow(firstRow.id, { productName: e.target.value })
                          }
                          className={`${fieldClass} font-semibold`}
                        />
                      </div>

                      {isSolo ? (
                        renderPortionFields(firstRow, {
                          onDelete: rows.length > 1 ? () => handleRemoveRow(firstRow.id) : undefined,
                          deleteAriaLabel: `Remover produto ${group.displayName || 'sem nome'}`,
                        })
                      ) : (
                        <>
                          <span className="hidden sm:block" />
                          <span className="hidden sm:block" />
                          <span className="hidden sm:block" />
                          <div className="hidden sm:flex items-end">
                            <span className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">
                              {group.rows.length} porções
                            </span>
                          </div>
                          <div className="flex items-end gap-1.5">
                            <div className="flex-1 min-w-0">
                              <label className={`${fieldLabelClass} sm:hidden`}>Valor Total</label>
                              <div className="w-full bg-[#0B1F3A]/[0.06] rounded-[10px] px-2.5 py-2 text-[#0B1F3A] text-[13px] type-number tabular-nums truncate font-semibold">
                                {formatCurrency(groupTotal, currencySymbol)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveGroup(group.rows.map((r) => r.id))}
                              aria-label={`Remover produto ${group.displayName}`}
                              className="shrink-0 p-1.5 mb-[1px] rounded-lg text-gray-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Portions — only rendered as a distinct nested
                        list once a product has 2+ portions; a solo
                        product's single portion is already rendered
                        inline on the header row above, so the common
                        case (most businesses have far more single-
                        portion products than multi-portion ones) looks
                        exactly as compact as it did before this
                        checkpoint. */}
                    {!isSolo && (
                      <div className="mt-1 pl-3 sm:pl-4 border-l-2 border-[#E5E7EB] space-y-1">
                        {group.rows.map((row, portionIdx) => (
                          <div key={row.id} className={`group ${rowGridClass}`}>
                            <div className="col-span-2 sm:col-span-1 flex items-center">
                              <span className="text-[11.5px] text-gray-400 font-semibold">
                                Porção {portionIdx + 1}
                              </span>
                            </div>
                            {renderPortionFields(row, {
                              onDelete: () => handleRemoveRow(row.id),
                              deleteAriaLabel: `Remover porção ${portionIdx + 1} de ${group.displayName}`,
                            })}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* [Grouped Initial Stock UX] "+ Adicionar Porção"
                        — only offered once the group actually has a
                        name to add a portion under; adding a portion
                        to a still-blank/not-yet-named row wouldn't
                        have anything to group it with. */}
                    {group.key && (
                      <button
                        type="button"
                        onClick={() => handleAddPortion(group.displayName)}
                        className="mt-1 ml-3 sm:ml-4 flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-400 hover:text-[#0B1F3A] transition-colors duration-150 py-0.5"
                      >
                        <Plus className="w-3 h-3" strokeWidth={2.5} />
                        Adicionar porção
                      </button>
                    )}

                    {/* [Product Memory / UOM — Increment A, Checkpoint 2,
                        now shown once PER GROUP instead of once per
                        portion — Grouped Initial Stock UX] Shown ONLY
                        for a product name that doesn't match anything
                        already in the catalog — never shown, never
                        asked again, for an already-known product
                        (isGenuinelyNewProductName, above). Entirely
                        optional: leaving it blank saves the product
                        with no confirmed Product Memory, exactly as
                        already happens today (BDR-0012 §5.A Item 6's
                        warn-not-block state). This never edits any
                        portion's own unit/quantity/costPrice — the
                        purchase-equivalent facts for Initial Stock —
                        it only ever ADDS an optional unitRelationship
                        candidate, stored on the group's FIRST row only
                        (handleSubmit, below, already only reads this
                        from whichever row actually has it set — see
                        its own comment).

                        [Sell-unit price conversion] The one thing this
                        section DOES now write into an existing
                        purchase-fact field is firstRow.sellingPrice —
                        computed as sellingPricePerSellingUnit × factor
                        the moment both are present, via
                        handleSellingPriceConversionChange below. This
                        is deliberately the only field it touches:
                        sellingPrice already means "price per this
                        row's own unit" everywhere else in the app
                        (normalizeStockCountItems, totalSellingValue,
                        Reports) — writing the converted value there,
                        instead of introducing a second sellingPrice
                        concept, means nothing downstream needs to
                        change to understand it. The main "Preço de
                        venda" field stays a normal, directly-editable
                        input throughout — this only ever pre-fills it,
                        never locks it, so typing over the computed
                        value works exactly as it always did. */}
                    {showUnitRelationshipSection && (
                      <div className="mt-1 pl-3 sm:pl-4">
                        <UnitRelationshipRow
                          purchaseUnit={firstRow.unit || 'un'}
                          sellingUnit={firstRow.newProductSellingUnit}
                          factor={firstRow.newProductSellingUnitFactor}
                          sellingPricePerSellingUnit={firstRow.sellingPricePerSellingUnit}
                          currencySymbol={currencySymbol}
                          computedSellingPrice={(() => {
                            const factor = parseFloat(firstRow.newProductSellingUnitFactor);
                            const perUnitPrice = parseFloat(firstRow.sellingPricePerSellingUnit);
                            if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(perUnitPrice) || perUnitPrice < 0) {
                              return null;
                            }
                            return Number((perUnitPrice * factor).toFixed(2));
                          })()}
                          onChange={(sellingUnit, factor) => {
                            const parsedFactor = parseFloat(factor);
                            const perUnitPrice = parseFloat(firstRow.sellingPricePerSellingUnit);
                            const fields: Partial<CountRowItem> = { newProductSellingUnit: sellingUnit, newProductSellingUnitFactor: factor };
                            // Keeps sellingPrice in sync if the owner
                            // adjusts the factor/unit after already
                            // having typed a per-selling-unit price —
                            // otherwise changing "20" to "24" here
                            // would silently leave the old, now-wrong
                            // computed price sitting in sellingPrice.
                            if (Number.isFinite(parsedFactor) && parsedFactor > 0 && Number.isFinite(perUnitPrice) && perUnitPrice >= 0) {
                              fields.sellingPrice = (perUnitPrice * parsedFactor).toFixed(2);
                            }
                            updateRow(firstRow.id, fields);
                          }}
                          onSellingPriceChange={(value) => {
                            const factor = parseFloat(firstRow.newProductSellingUnitFactor);
                            const perUnitPrice = parseFloat(value);
                            const fields: Partial<CountRowItem> = { sellingPricePerSellingUnit: value };
                            // Auto-fills the main sellingPrice field the
                            // instant both inputs are valid — the owner
                            // can still freely overwrite it afterward,
                            // exactly as any other pre-filled field.
                            if (Number.isFinite(factor) && factor > 0 && Number.isFinite(perUnitPrice) && perUnitPrice >= 0) {
                              fields.sellingPrice = (perUnitPrice * factor).toFixed(2);
                            }
                            updateRow(firstRow.id, fields);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#E5E7EB] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.05] text-gray-500 hover:text-[#0B1F3A] font-bold text-[12.5px] transition-all duration-150 flex items-center justify-center gap-2 group"
          >
            <Plus className="w-3.5 h-3.5 text-[#D4AF37] group-hover:scale-110 transition-transform duration-150" />
            <span>Adicionar outro produto</span>
          </button>

          {/* Total — the one number this screen exists to produce, given
              the same quiet serif treatment as hero figures elsewhere. */}
          <div className="card-dark-gradient rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" strokeWidth={2.25} />
              <span className="font-semibold text-white/70 text-[13px]">Capital Inicial Total</span>
            </div>
            <span className="font-display font-semibold text-[22px] sm:text-[24px] text-[#D4AF37] tabular-nums leading-none">
              {formatCurrency(totalCapital, currencySymbol)}
            </span>
          </div>

          {/* [FR-18, FR-19, FR-20 — Implementation Authorization §2
              item 8] The Confirm action is deliberately separated from
              ordinary editing controls above by the Total card, and
              requires this explicit second step before it does
              anything irreversible — a stray click on the primary
              button reveals this panel, nothing more; only the panel's
              own second, explicit action actually submits. */}
          {/* [Accidental-confirm hardening] The button that's always
              present in the normal editing flow is deliberately inert
              on its own — a single click here never writes anything
              (see handleSubmit's `if (!showConfirmStep)` guard) — so
              it needs no extra gate itself. It's still pulled away
              from "Adicionar outro produto" by a rule and extra
              space so it isn't the very next thing a thumb lands on
              while scrolling the product list. The action that's
              actually irreversible lives in the modal below, fully
              detached from this scrollable page (and from the fixed
              mobile bottom nav bar) so a stray scroll/tap here can
              never reach it. */}
          <div className="pt-3 mt-1 border-t border-[#E5E7EB] flex flex-col sm:flex-row gap-2.5">
            {onSkip && !redoingConfirmationId && (
              <button
                type="button"
                onClick={onSkip}
                className="sm:w-auto w-full py-3 px-4 rounded-xl border border-[#E5E7EB] text-gray-600 hover:bg-gray-50 hover:border-gray-300 font-bold text-sm transition-all duration-150"
              >
                Configurar mais tarde
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenConfirmStep}
              disabled={isSaving || isFlushingDraft}
              className="btn-primary flex-1 py-3 px-4 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>
                {isFlushingDraft
                  ? 'A guardar rascunho...'
                  : redoingConfirmationId
                    ? 'Confirmar Nova Contagem'
                    : 'Confirmar Capital Inicial'}
              </span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
            </button>
          </div>

          {/* [Accidental-confirm hardening] The actual submit control,
              rendered as a true modal — fixed/centered over a dimmed,
              non-interactive backdrop — rather than inline in the
              scrollable form. This is what makes it structurally safe,
              not just visually separated: it isn't part of the page's
              scroll flow at all, so no scroll-release tap or misplaced
              thumb can ever land on it, and the dimmed backdrop blocks
              every element behind it, including the mobile bottom nav
              bar. Reachable only by the genuinely deliberate first
              click above. Body scroll is locked below while open so
              the page behind it can't move under it either. */}
          {showConfirmStep && (
            <div
              className="fixed inset-0 z-50 bg-[#0B1F3A]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
              onClick={() => {
                if (!isSaving) {
                  setError(null);
                  setShowConfirmStep(false);
                }
              }}
            >
              <div
                className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border-2 border-[#D4AF37]/40 px-5 py-5 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-[#0B1F3A] shrink-0 mt-[3px]" strokeWidth={2.25} />
                  <p className="text-[13px] leading-relaxed text-[#0B1F3A]">
                    {redoingConfirmationId ? (
                      <>
                        Esta nova contagem vai substituir a confirmação anulada como o seu Capital Inicial ativo. Uma
                        vez confirmada, tem também a sua própria janela de recuperação de 12 horas — sujeita ao
                        limite máximo de recuperações para esta configuração de Capital Inicial.
                      </>
                    ) : (
                      <>
                        Esta ação estabelece o seu <strong className="font-semibold">Capital Inicial do Negócio</strong>.
                        Tem 12 horas após confirmar para anular e refazer, caso tenha cometido um erro — depois
                        disso, não é livremente reversível.
                      </>
                    )}
                  </p>
                </div>

                <div className="card-dark-gradient rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <span className="font-semibold text-white/70 text-[12.5px]">Capital Inicial Total</span>
                  <span className="font-display font-semibold text-[18px] text-[#D4AF37] tabular-nums leading-none">
                    {formatCurrency(totalCapital, currencySymbol)}
                  </span>
                </div>

                <label className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border border-[#E5E7EB] bg-[var(--muted)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reviewedBeforeConfirm}
                    onChange={(e) => {
                      setReviewedBeforeConfirm(e.target.checked);
                      if (e.target.checked) setError(null);
                    }}
                    className="mt-0.5 w-4 h-4 shrink-0 accent-[#0B1F3A]"
                  />
                  <span className="text-[12.5px] leading-relaxed text-gray-700">
                    Revi todos os produtos, quantidades e preços acima e confirmo que estão corretos.
                  </span>
                </label>

                {error && (
                  <p className="text-[12.5px] font-semibold text-red-600 -mt-1">{error}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setShowConfirmStep(false);
                    }}
                    disabled={isSaving}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-[#E5E7EB] bg-white text-gray-600 hover:bg-gray-50 font-bold text-[12.5px] transition-all duration-150"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-bold text-[12.5px] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'A guardar...' : 'Sim, confirmar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
