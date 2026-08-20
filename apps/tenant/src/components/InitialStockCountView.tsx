import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, getTodayDateString } from '../utils/formatters';
import { getSuggestedUnitsForCategory } from '../data/businessCategories';
import { Wallet, Plus, Trash2, ArrowRight, Info, CheckCircle2, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { SubscriptionBlockedNotice } from './SubscriptionBlockedNotice';
import { InitialStockDraftItem, UnitRelationship } from '../types';
import { isValidUnitRelationship } from '../lib/unitRelationship';
import { computePortionLabels } from '../lib/stockCountPortionGrouping';

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
  onChange: (sellingUnit: string, factor: string) => void;
}> = ({ purchaseUnit, sellingUnit, factor, onChange }) => {
  const [expanded, setExpanded] = useState(!!(sellingUnit || factor));

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-400 hover:text-[#0B1F3A] transition-colors duration-150 py-0.5"
      >
        <ChevronDown className="w-3 h-3" strokeWidth={2.5} />
        <span>Produto novo — configurar relação de unidades (opcional)</span>
      </button>
    );
  }

  return (
    <div className="bg-[var(--muted)] border border-[#E5E7EB] rounded-xl px-3 py-2.5 space-y-2">
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
          <label className="block type-label mb-1">Quantidade</label>
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
  });

  const [date, setDate] = useState(getTodayDateString());
  const [rows, setRows] = useState<CountRowItem[]>([createEmptyRow(), createEmptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  // [Amendment v1.0] Distinguishes "draft not loaded yet" from "no draft
  // exists" so an existing draft isn't overwritten by the two default
  // empty rows before the listener's first snapshot arrives.
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const skipNextAutosave = useRef(false);

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
    setError(null);
    setIsSaving(false);
    setSavedMessage(null);
    setDraftSaveState('idle');
    skipNextAutosave.current = false;
    setDraftLoaded(false); // re-arms the load effect below for the new business
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
      saveInitialStockDraft(rows.map(rowToDraftItem), date)
        .then(() => setDraftSaveState('saved'))
        .catch(() => setDraftSaveState('idle'));
    }, 800);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, date, draftLoaded, hasInitialStockCount]);

  const updateRow = (id: string, fields: Partial<CountRowItem>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...fields } : row)));
  };

  const handleAddRow = () => setRows((prev) => [...prev, createEmptyRow()]);

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((row) => row.id !== id));
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

  // [Increment B, Checkpoint B5 — Consolidated Specification §16] Purely
  // presentational: identifies which rows share a product name with
  // another row in THIS draft, so they can be visually labeled as
  // portions of one count for that product rather than reading as an
  // accidental duplicate entry. Computed fresh every render from the
  // current `rows` state — cheap (this list is never large) and always
  // in sync with in-progress edits. Feeds NOTHING into totalCapital
  // above, InitialStockDraftItem, or any Firestore write — see
  // stockCountPortionGrouping.ts's own header comment.
  const portionLabels = computePortionLabels(rows);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (hasInitialStockCount) {
      setError('O Capital Inicial já foi definido anteriormente e não pode ser alterado.');
      return;
    }

    const itemsToSave = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const trimmedName = row.productName.trim();
      if (!trimmedName) continue;

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
      await recordStockCount({ type: 'initial', date, items: itemsToSave });
      setSavedMessage('Capital Inicial registado com sucesso!');
      setTimeout(() => onComplete(), 1200);
    } catch (err: any) {
      setError(err.message || 'Erro ao registar o Capital Inicial.');
    } finally {
      setIsSaving(false);
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

  if (subscriptionBlocksNewRecords) {
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

          {/* Product grid — column header shown from sm+, rows collapse to
              stacked pairs on mobile with inline labels retained. */}
          <div>
            <div className={`hidden sm:grid ${rowGridClass.replace('sm:items-end', '')} pb-2 mb-1 border-b border-[#E5E7EB]`}>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Nome</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Qtd</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Unid</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Custo/Un</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Venda/Un</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Valor Total</span>
              <span />
            </div>

            <div className="space-y-1">
              {rows.map((row, idx) => {
                const showUnitRelationshipSection = isGenuinelyNewProductName(row.productName);
                // [Increment B, Checkpoint B5] Undefined only if `row.id`
                // is somehow absent from `rows` at label-computation time
                // — cannot happen in practice (portionLabels is derived
                // from this exact same `rows` array on every render) but
                // defensively defaulted rather than risking a crash.
                const portionLabel = portionLabels.get(row.id) ?? { isMultiPortion: false, portionIndex: 1, portionCount: 1 };
                return (
                <React.Fragment key={row.id}>
                <div
                  className={`group ${rowGridClass} rounded-xl px-2.5 py-2.5 -mx-2.5 transition-colors duration-150 hover:bg-[#FAFBFC]`}
                >
                  <div className="col-span-2 sm:col-span-1">
                    <label className={`${fieldLabelClass} sm:hidden`}>Nome</label>
                    <input
                      type="text"
                      placeholder="Ex: Arroz"
                      value={row.productName}
                      onChange={(e) => updateRow(row.id, { productName: e.target.value })}
                      className={fieldClass}
                    />
                    {/* [Increment B, Checkpoint B5 — Consolidated
                        Specification §16] Shown ONLY when 2+ rows in
                        this draft share this exact product name —
                        makes clear these rows are being combined as
                        portions of ONE product's count, each with its
                        own unit/price basis, never as an accidental
                        duplicate product entry. Purely informational;
                        changes no value, triggers no validation, and
                        has no effect on totalCapital or what gets
                        persisted — see computePortionLabels's own
                        header comment. */}
                    {portionLabel.isMultiPortion && (
                      <p className="mt-1 text-[10.5px] text-[#B8952F] font-medium leading-snug">
                        Porção {portionLabel.portionIndex} de {portionLabel.portionCount} — mesmo produto, será somado no total
                      </p>
                    )}
                  </div>

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
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        aria-label={`Remover produto ${idx + 1}`}
                        className="shrink-0 p-1.5 mb-[1px] rounded-lg text-gray-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* [Product Memory / UOM — Increment A, Checkpoint 2]
                    Shown ONLY for a row whose product name doesn't
                    match anything already in the catalog — never shown,
                    never asked again, for an already-known product
                    (isGenuinelyNewProductName, above). Entirely
                    optional: leaving it blank saves the product with no
                    confirmed Product Memory, exactly as already happens
                    today (BDR-0012 §5.A Item 6's warn-not-block state).
                    This never edits row.unit/quantity/costPrice — the
                    purchase-equivalent facts for Initial Stock — it only
                    ever ADDS an optional, separate unitRelationship
                    candidate alongside them. */}
                {showUnitRelationshipSection && (
                  <div className="col-span-2 sm:col-span-7 -mt-1 mb-1 pl-1">
                    <UnitRelationshipRow
                      purchaseUnit={row.unit || 'un'}
                      sellingUnit={row.newProductSellingUnit}
                      factor={row.newProductSellingUnitFactor}
                      onChange={(sellingUnit, factor) =>
                        updateRow(row.id, { newProductSellingUnit: sellingUnit, newProductSellingUnitFactor: factor })
                      }
                    />
                  </div>
                )}
                </React.Fragment>
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

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="sm:w-auto w-full py-3 px-4 rounded-xl border border-[#E5E7EB] text-gray-600 hover:bg-gray-50 hover:border-gray-300 font-bold text-sm transition-all duration-150"
              >
                Configurar mais tarde
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex-1 py-3 px-4 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{isSaving ? 'A guardar...' : 'Confirmar Capital Inicial'}</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
