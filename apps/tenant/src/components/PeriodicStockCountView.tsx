import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';
import { getSuggestedUnitsForCategory } from '../data/businessCategories';
import { StockCountType, PeriodicStockDraft, UnitRelationship } from '../types';
import { findMostRecentBatchForProduct } from '../lib/restockObservation';
import { tallyStockCountRows, StockCountWorkingRow, StockCountTallyResult, workingRowToDraftItem, draftItemToWorkingRow } from '../utils/stockCount';
import { isValidUnitRelationship } from '../lib/unitRelationship';
import { computePortionLabels, groupRowsByProductName } from '../lib/stockCountPortionGrouping';
// [Business Worth Evolution — Implementation Authorization, Increment 4;
// Specification §15, FR-20-FR-23] The ONLY valuation engine this file
// uses for Mode A — reused exactly as-is, never duplicated. See that
// file's own header comment for the full design-pass resolution of Rule
// 8 open question #1. Mode B needs no import here at all: it is this
// codebase's existing, unconditional, already-shipped per-portion
// sellingPrice entry (every input below, unchanged) — nothing in this
// file's own pre-existing code path is touched to support it.
import { deriveModeAPortionValuations, canApplyModeA, type ContagemPortionQuantity } from '../lib/contagemMultiUnitValuation';
import { SubscriptionBlockedNotice } from './SubscriptionBlockedNotice';
import {
  ClipboardList,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Info,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  ChevronDown,
  ChevronUp,
  Search,
  AlertTriangle,
  RotateCw,
  Undo2,
} from 'lucide-react';

interface PeriodicStockCountViewProps {
  onComplete: () => void;
}

// A row keyed by its catalog Product id — one per Product document
// currently in `products` (Amendment Part 6/BDR-0009 Part 3's "active
// product" definition: exists in the collection = eligible). Never
// deleted from state when the operator hits "Remover" — only flagged
// `removed`, so it still resolves to Not Counted rather than vanishing
// from the tally entirely (Amendment Part 10).
type CatalogRowState = Record<string, StockCountWorkingRow>;

const TYPE_LABELS: Record<StockCountType, string> = {
  initial: 'Capital Inicial',
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
  custom: 'Personalizada',
};

const TYPE_OPTIONS: { value: StockCountType; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
  { value: 'custom', label: 'Personalizada' },
];

// [Business Worth Evolution — Decision 37, B.2: Arbitrary-Length
// Unit-Relationship Entry] Replaces this file's own former
// UnitRelationshipRow (a fixed two-level {sellingUnit, factor} pair —
// identical in spirit to InitialStockCountView.tsx's/AddStockView.tsx's
// own still-unchanged two-level components, which this item
// deliberately does NOT touch, per the existing "deliberately
// duplicated per file, not shared" discipline those files' own header
// comments already establish; a future consolidation checkpoint may
// revisit that, not this item).
//
// `steps` represents the chain AFTER the product's own purchase unit:
// `steps[0]` is "1 purchaseUnit = steps[0].factor steps[0].unit",
// `steps[1]` is "1 steps[0].unit = steps[1].factor steps[1].unit", and
// so on — i.e. each step's factor is `factorFromPrevious` for the
// level it introduces, exactly matching Product.unitRelationship.units[]'s
// own existing, UNCHANGED convention (product-unit-of-measure-
// specification.md §2; purchaseToSellingConversion.ts's own header
// comment). The caller (NewProductInfoPanel's call site) is
// responsible for turning `[{unit: purchaseUnit, factorFromPrevious: 0}]
// .concat(steps.map(...))` into the actual UnitRelationship candidate —
// this component only edits the step list, never constructs or
// validates a UnitRelationship itself (isValidUnitRelationship remains
// the single source of truth for that, applied at submit time, exactly
// as before this item).
//
// Removing a step truncates the chain from that point onward (never
// leaves an orphaned later step referencing a since-removed unit) —
// this is the "prevent nonsensical/inconsistent chain construction"
// requirement, satisfied structurally rather than by extra validation
// logic this file would otherwise have to invent. "+ Adicionar nível"
// is disabled until the current last step has both a unit and a valid
// positive factor filled in, for the same reason.
const UnitRelationshipChainEditor: React.FC<{
  purchaseUnit: string;
  steps: { unit: string; factor: string }[];
  onChange: (steps: { unit: string; factor: string }[]) => void;
}> = ({ purchaseUnit, steps, onChange }) => {
  const [expanded, setExpanded] = useState(steps.some((s) => s.unit || s.factor));

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => {
          setExpanded(true);
          // Seed one real, empty first level in actual state on
          // expansion (rather than faking a placeholder row in render
          // only) — a display-only placeholder that doesn't exist in
          // `steps` would make updateStep(0, ...) a silent no-op the
          // first time the Owner types into it, since
          // steps.map(...) over a genuinely empty array touches
          // nothing. Seeding for real here means every rendered input
          // always corresponds to a real array index.
          if (steps.length === 0) onChange([{ unit: '', factor: '' }]);
        }}
        className="flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-400 hover:text-[#0B1F3A] transition-colors duration-150 py-0.5"
      >
        <ChevronDown className="w-3 h-3" strokeWidth={2.5} />
        <span>Configurar relação de unidades (opcional)</span>
      </button>
    );
  }

  const lastStep = steps[steps.length - 1];
  const lastStepFactor = lastStep ? parseFloat(lastStep.factor) : NaN;
  const canAddLevel = !lastStep || (!!lastStep.unit.trim() && Number.isFinite(lastStepFactor) && lastStepFactor > 0);

  const updateStep = (index: number, fields: Partial<{ unit: string; factor: string }>) => {
    onChange(steps.map((s, i) => (i === index ? { ...s, ...fields } : s)));
  };

  const removeFromStep = (index: number) => {
    // Truncates the chain from `index` onward — the only removal shape
    // that can never leave a later step referencing a unit that no
    // longer exists in the chain.
    onChange(steps.slice(0, index));
  };

  const addLevel = () => {
    onChange([...steps, { unit: '', factor: '' }]);
  };

  return (
    <div className="-mt-1 bg-[var(--muted)] border border-[#E5E7EB] rounded-xl px-3 py-2.5 space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-500 hover:text-[#0B1F3A] transition-colors duration-150"
      >
        <ChevronUp className="w-3 h-3" strokeWidth={2.5} />
        <span>Relação de unidades (opcional)</span>
      </button>

      <div className="space-y-1.5">
        {steps.map((step, index) => {
          const previousUnitLabel = index === 0 ? purchaseUnit || 'un' : steps[index - 1]?.unit || 'un';
          return (
            <div key={index} className="flex flex-wrap items-end gap-2.5 text-[12.5px]">
              <span className="text-gray-500 pb-2">
                1 <strong className="text-[#111827]">{previousUnitLabel}</strong> =
              </span>
              <div>
                <label className="block text-[10.5px] font-bold text-gray-500 mb-1">Quantidade</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={step.factor}
                  onChange={(e) => updateStep(index, { factor: e.target.value })}
                  placeholder="Ex: 4"
                  className="w-24 bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-1.5 text-[13px] font-mono tabular-nums focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-gray-500 mb-1">Unidade</label>
                <input
                  type="text"
                  value={step.unit}
                  onChange={(e) => updateStep(index, { unit: e.target.value })}
                  placeholder="Ex: Emb"
                  className="w-28 bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-1.5 text-[13px] font-mono focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </div>
              <button
                type="button"
                onClick={() => removeFromStep(index)}
                aria-label={`Remover nível ${index + 1} e seguintes`}
                className="p-1.5 mb-[1px] rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addLevel}
        disabled={!canAddLevel}
        className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#0B1F3A] hover:text-[#D4AF37] disabled:text-gray-300 disabled:cursor-not-allowed transition-colors duration-150"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Adicionar nível</span>
      </button>

      <p className="text-[11px] text-gray-400 leading-relaxed">
        Deixe em branco se não quiser configurar agora — pode fazê-lo mais tarde na ficha do produto.
      </p>
    </div>
  );
};

// [Business Worth Evolution — Implementation Authorization, Increment 4;
// Specification §15, FR-20] The ONLY new Owner-facing control this
// Increment adds — rendered exactly once per multi-portion product group
// (never per-row), right where that group's existing "Porção X de Y"
// caption already appears. Deliberately a plain toggle + two inputs, no
// new screen, no new navigation, no Dashboard/design-system change —
// "the smallest possible UI change" per the governing prompt.
//
// Mode B (the default — unchanged) needs no control here at all: it is
// simply what happens when this toggle is off, which is every existing
// portion row's own already-present "Venda/Un" price input, untouched.
const ModeAValuationControl: React.FC<{
  referenceUnitOptions: string[];
  active: boolean;
  referenceUnit: string;
  referencePrice: string;
  currencySymbol: string;
  /** True when every current portion's unit is convertible against
   * referenceUnit (canApplyModeA) — false surfaces a non-blocking notice
   * that at least one portion's price was left untouched, never a
   * fabricated conversion (UOM Specification §4 Item 6). */
  allPortionsConvertible: boolean;
  onToggle: (enable: boolean) => void;
  onChange: (fields: Partial<{ referenceUnit: string; referencePrice: string }>) => void;
}> = ({ referenceUnitOptions, active, referenceUnit, referencePrice, currencySymbol, allPortionsConvertible, onToggle, onChange }) => {
  return (
    <div className="col-span-2 sm:col-span-7 -mt-1 mb-1">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 select-none">
        <input type="checkbox" checked={active} onChange={(e) => onToggle(e.target.checked)} className="rounded" />
        Usar um único preço de venda para todas as porções deste produto (convertido automaticamente)
      </label>
      {active && (
        <div className="mt-1.5 flex flex-wrap items-end gap-2.5 bg-[var(--muted)] border border-[#E5E7EB] rounded-xl px-3 py-2.5">
          <div>
            <label className="block text-[10.5px] font-bold text-gray-500 mb-1">Unidade de referência</label>
            <select
              value={referenceUnit}
              onChange={(e) => onChange({ referenceUnit: e.target.value })}
              className="bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-1.5 text-[13px] font-mono focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            >
              {referenceUnitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10.5px] font-bold text-gray-500 mb-1">Preço de venda ({currencySymbol}) por {referenceUnit || 'unidade'}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={referencePrice}
              onChange={(e) => onChange({ referencePrice: e.target.value })}
              placeholder="Ex: 1250"
              className="w-28 bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-1.5 text-[13px] font-mono tabular-nums focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed basis-full">
            O preço de cada porção é calculado automaticamente a partir deste preço único — as quantidades e unidades físicas contadas não são alteradas.
          </p>
          {!allPortionsConvertible && (
            <p className="text-[11px] text-amber-600 font-medium leading-relaxed basis-full">
              Uma ou mais porções têm uma unidade que não faz parte da relação de unidades confirmada deste produto — o preço dessas porções não foi alterado; introduza-o manualmente.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// [Business Worth Evolution — Decision 37, B.1: Product-Level
// First-Time Contagem Information Panel; extended by B.2 for
// arbitrary-length relationship entry] Rendered ONCE per genuinely-new
// product group — the caller gates this on portionLabel.portionIndex
// === 1 && isGenuinelyNewProductName(...), exactly mirroring how
// ModeAValuationControl (Increment 4, above) is already gated to render
// once per group, never once per portion. That gate is a PRESENTATION
// choice only (one visible location to enter this, not one per
// portion) — the data itself is owned by the PRODUCT, via the
// newProductInfo state (keyed by productKeyFor, same convention as
// modeAGroups), never by the specific row this panel happens to be
// rendered next to. B.1's own correction established this: an earlier
// pass stored this data on the portionIndex === 1 row's own fields,
// which meant deleting that one row silently destroyed it —
// newProductInfo's group-level key means removing or reordering any
// portion row can never lose this data. B.2 extends newProductInfo's
// own shape (relationshipSteps, an arbitrary-length array) but does
// not change this ownership model at all.
//
// Collects the three foundational, product-level pieces of information
// Decision 37 items 1/2/3 name: product identity (read-only echo of
// this group's own name — the single per-row name input remains the
// one editable place that name is typed; a second, independently-
// editable name field here would create two sources of truth for the
// same value), original purchase/cost basis (purchaseUnit/
// purchaseCost), and the unit relationship (relationshipSteps, edited
// via UnitRelationshipChainEditor). Purely presentational + the
// newProductInfo field bindings; introduces no new calculation, no
// change to submission/normalization beyond correctly sourcing the
// relationship steps this panel already collected, and no change to
// StockCountWorkingRow.unit/quantity/costPrice/sellingPrice. Does NOT
// derive or display any per-level cost (e.g. "312.50 MZN/Emb") — that
// remains explicitly out of scope, deferred to B.4/FR-67.
const NewProductInfoPanel: React.FC<{
  productName: string;
  currencySymbol: string;
  purchaseUnit: string;
  purchaseCost: string;
  onPurchaseUnitChange: (value: string) => void;
  onPurchaseCostChange: (value: string) => void;
  relationshipSteps: { unit: string; factor: string }[];
  onRelationshipStepsChange: (steps: { unit: string; factor: string }[]) => void;
}> = ({
  productName,
  currencySymbol,
  purchaseUnit,
  purchaseCost,
  onPurchaseUnitChange,
  onPurchaseCostChange,
  relationshipSteps,
  onRelationshipStepsChange,
}) => {
  return (
    <div className="col-span-2 sm:col-span-7 -mt-1 mb-1.5 bg-[var(--muted)] border border-[#E5E7EB] rounded-xl px-3 py-3 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#B8952F]">Produto novo</span>
        <span className="text-[12.5px] font-semibold text-[#111827] truncate">{productName || '—'}</span>
      </div>

      <div>
        <p className="text-[10.5px] font-bold text-gray-500 mb-1">Custo de Compra Original</p>
        <div className="flex flex-wrap items-end gap-2.5 text-[12.5px]">
          <div>
            <label className="block text-[10.5px] font-bold text-gray-500 mb-1">Unidade de compra</label>
            <input
              type="text"
              value={purchaseUnit}
              onChange={(e) => onPurchaseUnitChange(e.target.value)}
              placeholder="Ex: Cx"
              className="w-24 bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-1.5 text-[13px] font-mono text-center focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
          </div>
          <div>
            <label className="block text-[10.5px] font-bold text-gray-500 mb-1">Custo ({currencySymbol}) por unidade de compra</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={purchaseCost}
              onChange={(e) => onPurchaseCostChange(e.target.value)}
              placeholder="Ex: 1250"
              className="w-28 bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-1.5 text-[13px] font-mono tabular-nums focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
          </div>
        </div>
        <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
          Introduza o custo original uma única vez, na unidade de compra do produto — nunca por porção.
        </p>
      </div>

      <UnitRelationshipChainEditor purchaseUnit={purchaseUnit} steps={relationshipSteps} onChange={onRelationshipStepsChange} />
    </div>
  );
};

export const PeriodicStockCountView: React.FC<PeriodicStockCountViewProps> = ({ onComplete }) => {
  const {
    business,
    businessCategory,
    currencySymbol,
    recordStockCount,
    stockCounts,
    hasInitialStockCount,
    expectedCurrentStockValue,
    subscriptionBlocksNewRecords,
    products,
    batches,
    productsError,
    periodicStockDraft,
    periodicStockDraftLoaded,
    savePeriodicStockDraft,
    clearPeriodicStockDraft,
    // [Business Worth Evolution — Implementation Authorization, Increment
    // 8; Specification §25, §26, FR-38, FR-39, FR-58] Correction/
    // recovery mode — set only via DashboardView's own eligibility-
    // gated entry point (AppContext's startBusinessWorthCorrection),
    // never entered here directly. This screen's own confirmation
    // write path is otherwise entirely unmodified — the same tally/
    // review/confirm flow every ordinary Contagem already uses.
    pendingBusinessWorthCorrection,
    clearBusinessWorthCorrection,
  } = useApp();
  const suggestedUnits = getSuggestedUnitsForCategory(businessCategory);

  const createManualRow = (): StockCountWorkingRow => ({
    productId: undefined,
    productName: '',
    quantity: '',
    unit: suggestedUnits[0] || 'un',
    costPrice: '',
    sellingPrice: '',
  });

  // [Product Memory / UOM — Increment A, Checkpoint 2c] Identical
  // gating logic to InitialStockCountView.tsx's/AddStockView.tsx's own
  // helpers (Checkpoints 2a/2b) — the same case-insensitive lookup
  // AppContext.tsx's own product-creation paths use. Applied only to
  // manualRows (below): a catalogRows entry always already has a
  // productId (buildCatalogRow, immediately below) and therefore is
  // never "genuinely new" by construction — Recognition/configuration
  // is never offered for it, matching UOM Specification §3 step 5's
  // "never re-run" rule.
  const isGenuinelyNewProductName = (name: string): boolean => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return false;
    return !products.some((p) => p.name.toLowerCase() === trimmed);
  };

  // Builds one auto-populated working row from an existing catalog
  // Product — reference metadata pre-filled from its most recent
  // StockBatch (Amendment Part 11), falling back to the Product's own
  // reference cost/selling price, and left blank (never invented) when
  // neither exists. Quantity always starts blank ("not yet counted" —
  // BDR-0009 Part 4), never 0.
  const buildCatalogRow = (product: { id: string; name: string; costPrice?: number; sellingPrice?: number }): StockCountWorkingRow => {
    const latestBatch = findMostRecentBatchForProduct(batches, product.id);
    const costPrice = latestBatch ? String(latestBatch.costPrice) : product.costPrice != null ? String(product.costPrice) : '';
    const sellingPrice = latestBatch ? String(latestBatch.sellingPrice) : product.sellingPrice != null ? String(product.sellingPrice) : '';
    const unit = latestBatch?.unit ? latestBatch.unit : '';
    return {
      productId: product.id,
      productName: product.name,
      quantity: '',
      unit,
      costPrice,
      sellingPrice,
    };
  };

  const [type, setType] = useState<StockCountType>('monthly');
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  // Keyed by productId so a re-render triggered by the products
  // listener (e.g. another device adding a product mid-count) can
  // merge in the new row without disturbing any quantity the operator
  // already typed into an existing one.
  const [catalogRows, setCatalogRows] = useState<CatalogRowState>({});
  const [manualRows, setManualRows] = useState<StockCountWorkingRow[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [savedTotal, setSavedTotal] = useState<number>(0);
  const [savedTally, setSavedTally] = useState<StockCountTallyResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  // Mandatory Counted/Not Counted confirmation step before an actual
  // save (Amendment Part 9) — holds the tally computed from the
  // working list at the moment "Confirmar Contagem" was first pressed.
  const [pendingTally, setPendingTally] = useState<StockCountTallyResult | null>(null);

  // [Stock Count Data-Loss Resilience — Implementation Task] Draft
  // lifecycle state (frozen spec §4) — rendered distinctly from
  // isSaving/savedMessage above (§1a: draft durability and finalization
  // status are never the same UI signal).
  const [draftSaveState, setDraftSaveState] = useState<'editing' | 'saving' | 'saved' | 'save-failed'>('editing');
  // Whether the operator has already resolved the stale-draft resume
  // banner this mount (Retomar or Começar de novo) — gates the main
  // form per §5/§6 ("never silently auto-loaded").
  const [draftBannerDismissed, setDraftBannerDismissed] = useState(false);

  // §4a — ordinary row-content autosave: a not-yet-fired timer handle,
  // and the in-flight write's own promise once it has fired. Safe to
  // discard on confirm (finalization reads live component state, never
  // this draft) — see handleConfirmSave.
  const draftDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftInFlightSaveRef = useRef<Promise<void> | null>(null);
  // §4b — the one write that must NEVER be discarded: the immediate,
  // non-debounced write that establishes the submission identity
  // (issued from handleRequestConfirmation), always awaited in full by
  // handleConfirmSave before finalization begins.
  const identityWriteRef = useRef<Promise<void> | null>(null);
  // The submission identity itself (frozen spec §7): generated once on
  // first entry into pendingTally, reused across every retry, cleared
  // by every row/type/date/label-change handler below so that backing
  // out and materially editing regenerates it on the next confirmation
  // attempt, per §7's "last-second edit wins" principle.
  const submissionIdRef = useRef<string | null>(null);

  // Auto-populate: every Product currently in the catalog gets a
  // working row (BDR-0009 Part 3 — "active" = exists in `products`).
  // Merge-only: a product already represented in `catalogRows` is left
  // untouched so an in-progress count survives the products listener
  // delivering an unrelated update. New products are added with a
  // fresh blank row; a product that no longer exists in `products` at
  // all (hard-deleted) is dropped, since Amendment Part 6 has nothing
  // left to source it from.
  useEffect(() => {
    setCatalogRows((prev) => {
      const next: CatalogRowState = {};
      for (const product of products) {
        next[product.id] = prev[product.id] || buildCatalogRow(product);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Past counts, most recent first, excluding the 'initial' one (shown separately as baseline)
  const pastCounts = [...stockCounts]
    .filter((s) => s.type !== 'initial')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const mostRecentCount = pastCounts[0] || null;
  // [Amendment v1.0 — 10-expected-stock-value-amendment.md, Part 4]
  // Comparison baseline is now Expected Current Stock Value,
  // unconditionally — this supersedes the prior "most recent count,
  // falling back to Initial Capital" rule. `mostRecentCount` is kept
  // (used for the history list and the "since your last count" label
  // context below), but no longer feeds `comparisonBaseline`.
  const comparisonBaseline = expectedCurrentStockValue;

  // [Implementation Task, Section 2/6] Firestore-safe conversion —
  // extracted to utils/stockCount.ts as a pure function (workingRowToDraftItem)
  // so the "blank never becomes zero" property can be proven with a
  // real, runnable unit test rather than only an emulator test.

  // [Implementation Task, Section 4a] Ordinary row-content autosave —
  // called directly from row/type/date/label-change handlers below,
  // never from a useEffect keyed on component state, so cancellation at
  // confirmation time (handleConfirmSave) never depends on an effect's
  // dependency array staying complete — the exact shape of the existing
  // Initial Count bug this task exists to not repeat. Every argument is
  // passed explicitly by the caller (the just-computed next value, not
  // read from this closure's own state) so a call made synchronously
  // right after a setState call always schedules the CURRENT edit, not
  // a stale pre-update snapshot.
  const scheduleDraftSave = (
    nextCatalogRows: CatalogRowState,
    nextManualRows: StockCountWorkingRow[],
    nextType: StockCountType,
    nextLabel: string,
    nextDate: string
  ) => {
    if (draftDebounceTimerRef.current) clearTimeout(draftDebounceTimerRef.current);
    // `editing`: local changes exist, not yet acknowledged by Firestore
    // (frozen spec §4) — set immediately, before the delay, distinct
    // from `saving` which is reserved for once the write is actually
    // in flight.
    setDraftSaveState('editing');
    draftDebounceTimerRef.current = setTimeout(() => {
      draftDebounceTimerRef.current = null;
      setDraftSaveState('saving');
      const allRows = [...Object.values(nextCatalogRows), ...nextManualRows].map(workingRowToDraftItem);
      const savePromise = savePeriodicStockDraft(
        allRows,
        nextType,
        nextLabel.trim() || undefined,
        nextDate,
        submissionIdRef.current || undefined
      )
        .then(() => setDraftSaveState('saved'))
        .catch(() => setDraftSaveState('save-failed'))
        .finally(() => {
          draftInFlightSaveRef.current = null;
        });
      draftInFlightSaveRef.current = savePromise;
    }, 800);
  };

  const updateCatalogRow = (productId: string, fields: Partial<StockCountWorkingRow>) => {
    if (!catalogRows[productId]) return;
    // [§7] Any edit after at least one confirmation attempt invalidates
    // the identity that attempt used — the next confirmation generates
    // a fresh one. A no-op before the first attempt (already null).
    submissionIdRef.current = null;
    const nextCatalogRows = { ...catalogRows, [productId]: { ...catalogRows[productId], ...fields } };
    setCatalogRows(nextCatalogRows);
    scheduleDraftSave(nextCatalogRows, manualRows, type, label, date);
  };

  // Not a delete — flips `removed`, so the product stays represented
  // in the tally as Not Counted rather than disappearing from the
  // count entirely (Amendment Part 10).
  const handleRemoveCatalogRow = (productId: string) => {
    updateCatalogRow(productId, { removed: true, quantity: '' });
  };

  const handleRestoreCatalogRow = (productId: string) => {
    updateCatalogRow(productId, { removed: false });
  };

  // [Business Worth Evolution — Implementation Authorization, Increment 4;
  // Specification §15, FR-20] Mode A activation state for THIS DRAFT
  // ONLY — keyed by trimmed, lowercased productName, the SAME key
  // computePortionLabels/portionLabels already use (stockCountPortionGrouping.ts).
  // Deliberately transient component state, never written to
  // PeriodicStockDraft/Firestore: Mode A's own OUTPUT (a derived
  // sellingPrice written onto each portion row below) already flows
  // through the existing, unmodified StockCountWorkingRow.sellingPrice
  // field, which the existing autosave/draft-recovery path already
  // persists and restores correctly with ZERO changes to that path —
  // exactly the "one authoritative valuation path" design this
  // Increment's engine already committed to. A resumed draft therefore
  // still carries every Mode-A-derived price exactly as it was, even
  // though the fact that Mode A produced it is not itself remembered
  // across a resume (the Owner would simply see the same numbers, still
  // freely editable — never a functional loss, only a transparency nuance
  // limited to the Mode A toggle's own on/off display for an
  // interrupted-and-resumed session). Absence of a key here means Mode B
  // — this codebase's existing default — exactly as everywhere else in
  // this capability (unitRelationship, expectedValueAtCount, etc.).
  const [modeAGroups, setModeAGroups] = useState<Record<string, { referenceUnit: string; referencePrice: string }>>({});

  const productKeyFor = (name: string) => name.trim().toLowerCase();

  // [Business Worth Evolution — Decision 37, B.1: Product-Level
  // First-Time Contagem Information Panel; B.2: Arbitrary-Length
  // Unit-Relationship Entry] Product-level first-time information —
  // keyed by productKeyFor, the SAME convention modeAGroups already
  // uses immediately above, for the SAME reason: this data belongs to
  // the PRODUCT, not to whichever row happens to render its panel.
  // Storing it here instead of on a specific StockCountWorkingRow
  // means deleting or reordering any portion row (handleRemoveManualRow)
  // can never destroy it — fixing a real data-loss bug B.1's own
  // correction found (product-level data was originally stored on the
  // portionIndex === 1 row; deleting that one row silently lost it).
  // `relationshipSteps` (added by B.2) replaces what was originally a
  // fixed {sellingUnit, factor} pair with an arbitrary-length array —
  // relationshipSteps[i].unit/factor is the (i+1)-th level of the
  // chain after purchaseUnit, in the SAME order
  // Product.unitRelationship.units[] already expects (see
  // UnitRelationshipChainEditor's own header comment for the exact
  // mapping). Deliberately transient component state, never written to
  // PeriodicStockDraft/Firestore — same discipline modeAGroups itself
  // already documents above.
  const [newProductInfo, setNewProductInfo] = useState<
    Record<string, { purchaseUnit: string; purchaseCost: string; relationshipSteps: { unit: string; factor: string }[] }>
  >({});

  const getUnitRelationshipForProductName = (name: string) => {
    const trimmed = productKeyFor(name);
    if (!trimmed) return undefined;
    return products.find((p) => p.name.toLowerCase() === trimmed)?.unitRelationship;
  };

  // Gathers every row (catalog AND manual — a multi-portion product may
  // be split across both, exactly as portionLabels above already
  // accounts for) currently belonging to one product's group, in the
  // exact shape deriveModeAPortionValuations needs. Row ids are prefixed
  // so results can be routed back to the correct updater (updateCatalogRow
  // vs updateManualRow) without guessing.
  const collectGroupPortions = (productKey: string): ContagemPortionQuantity[] => {
    const fromCatalog: ContagemPortionQuantity[] = Object.entries(catalogRows)
      .filter(([, row]) => !row.removed && productKeyFor(row.productName) === productKey)
      .map(([productId, row]) => ({ id: `catalog:${productId}`, unit: row.unit.trim() || 'un', quantity: Number(row.quantity) || 0 }));
    const fromManual: ContagemPortionQuantity[] = manualRows
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => productKeyFor(row.productName) === productKey)
      .map(({ row, idx }) => ({ id: `manual:${idx}`, unit: row.unit.trim() || 'un', quantity: Number(row.quantity) || 0 }));
    return [...fromCatalog, ...fromManual];
  };

  // Mode A's own write-back step: derives every portion's price from the
  // group's single reference price/unit (the ALREADY-TESTED engine, this
  // file's own new import above) and writes each derived price onto that
  // portion's EXISTING sellingPrice field via the EXISTING updater
  // functions — never touching quantity or unit (FR-21), never touching
  // costPrice (FR-23), never introducing a second sellingValue
  // calculation (liveTally/tallyStockCountRows below computes
  // quantity*sellingPrice exactly as it always has, completely unaware
  // of which mode produced this particular sellingPrice). A portion whose
  // unit cannot be converted (outside the confirmed chain) is left
  // entirely untouched — never coerced to a fabricated price — so the
  // Owner can still enter it manually, exactly UOM Specification §4 Item
  // 6's existing warn-and-allow discipline.
  const applyModeAToGroup = (productKey: string, referenceUnit: string, referencePriceRaw: string) => {
    const referencePrice = Number(referencePriceRaw);
    if (!referenceUnit || !Number.isFinite(referencePrice)) return;
    const relationship = getUnitRelationshipForProductName(productKey);
    const portions = collectGroupPortions(productKey);
    if (!portions.length) return;
    const derived = deriveModeAPortionValuations(portions, referenceUnit, referencePrice, relationship);
    for (const d of derived) {
      if (d.derivedSellingPrice === null) continue;
      if (d.id.startsWith('catalog:')) {
        updateCatalogRow(d.id.slice('catalog:'.length), { sellingPrice: String(d.derivedSellingPrice) });
      } else if (d.id.startsWith('manual:')) {
        updateManualRow(Number(d.id.slice('manual:'.length)), { sellingPrice: String(d.derivedSellingPrice) });
      }
    }
  };

  const handleModeAToggle = (productKey: string, enable: boolean) => {
    if (!enable) {
      setModeAGroups((prev) => {
        const next = { ...prev };
        delete next[productKey];
        return next;
      });
      return;
    }
    const relationship = getUnitRelationshipForProductName(productKey);
    const defaultReferenceUnit = relationship?.units?.[0]?.unit || '';
    setModeAGroups((prev) => ({ ...prev, [productKey]: { referenceUnit: defaultReferenceUnit, referencePrice: '' } }));
  };

  const handleModeAFieldChange = (productKey: string, fields: Partial<{ referenceUnit: string; referencePrice: string }>) => {
    setModeAGroups((prev) => {
      const current = prev[productKey] ?? { referenceUnit: '', referencePrice: '' };
      const nextConfig = { ...current, ...fields };
      const next = { ...prev, [productKey]: nextConfig };
      applyModeAToGroup(productKey, nextConfig.referenceUnit, nextConfig.referencePrice);
      return next;
    });
  };

  const updateManualRow = (index: number, fields: Partial<StockCountWorkingRow>) => {
    submissionIdRef.current = null;
    const nextManualRows = manualRows.map((row, i) => (i === index ? { ...row, ...fields } : row));
    setManualRows(nextManualRows);
    scheduleDraftSave(catalogRows, nextManualRows, type, label, date);
  };

  const handleAddManualRow = () => {
    submissionIdRef.current = null;
    const nextManualRows = [...manualRows, createManualRow()];
    setManualRows(nextManualRows);
    scheduleDraftSave(catalogRows, nextManualRows, type, label, date);
  };

  const handleRemoveManualRow = (index: number) => {
    submissionIdRef.current = null;
    const nextManualRows = manualRows.filter((_, i) => i !== index);
    setManualRows(nextManualRows);
    scheduleDraftSave(catalogRows, nextManualRows, type, label, date);
  };

  // [Business Worth Evolution — Decision 37, B.3: Multiple
  // Current-Stock Portions + First-Class "+ Adicionar Porção" UX]
  // Adds a new portion row PRE-FILLED with an existing manual-row
  // group's own name — the only behavioral difference from
  // handleAddManualRow above, which always creates a wholly blank row.
  // Everything else about the new row (quantity, unit, costPrice,
  // sellingPrice) starts blank, exactly like any other new row.
  // Mirrors InitialStockCountView.tsx's own handleAddPortion exactly
  // (Grouped Initial Stock UX precedent) — reused as a pattern, not as
  // shared code (that file is not imported from or modified by this
  // item, per the explicit instruction not to touch it unless
  // absolutely necessary). Because grouping (manualRowGroups, below) is
  // computed fresh from `manualRows` on every render, this new row is
  // picked up into the SAME card automatically — there is no separate
  // "group" state to update, and no product-level state (newProductInfo)
  // is touched by this handler at all.
  const handleAddPortionToManualGroup = (groupDisplayName: string) => {
    submissionIdRef.current = null;
    const nextManualRows = [...manualRows, { ...createManualRow(), productName: groupDisplayName }];
    setManualRows(nextManualRows);
    scheduleDraftSave(catalogRows, nextManualRows, type, label, date);
  };

  // [Business Worth Evolution — Decision 37, B.3] Renames every manual
  // row currently in the group keyed by `groupKey` (a trimmed,
  // lowercased product name — see groupRowsByProductName) to `newName`,
  // in one update — mirroring InitialStockCountView.tsx's own
  // handleRenameGroup exactly. A plain client-side array transform over
  // the SAME flat `manualRows` state; writes nothing to Firestore
  // directly (autosave picks up the result exactly as it already does
  // for any other edit). Renaming a group to a name that now matches an
  // existing catalog product, or a different manual group, is correct,
  // intended behavior — the group simply re-forms under the new name on
  // the next render (or merges into the matching group), exactly as
  // typing a matching name into any single row already does today.
  // Deliberately does NOT touch newProductInfo — that state is already
  // keyed by CURRENT product name at every read site (the panel's own
  // call site, and the submit-time correlation loop), so a rename
  // simply changes which key is read/written next, never requiring an
  // explicit migration step here.
  const handleRenameManualGroup = (groupKey: string, newName: string) => {
    if (!groupKey) return; // a blank/solo group has no shared name to rename — its own input already handles this via updateManualRow
    submissionIdRef.current = null;
    const nextManualRows = manualRows.map((row) => (productKeyFor(row.productName) === groupKey ? { ...row, productName: newName } : row));
    setManualRows(nextManualRows);
    scheduleDraftSave(catalogRows, nextManualRows, type, label, date);
  };

  const handleTypeChange = (nextType: StockCountType) => {
    submissionIdRef.current = null;
    setType(nextType);
    scheduleDraftSave(catalogRows, manualRows, nextType, label, date);
  };

  const handleLabelChange = (nextLabel: string) => {
    submissionIdRef.current = null;
    setLabel(nextLabel);
    scheduleDraftSave(catalogRows, manualRows, type, nextLabel, date);
  };

  const handleDateChange = (nextDate: string) => {
    submissionIdRef.current = null;
    setDate(nextDate);
    scheduleDraftSave(catalogRows, manualRows, type, label, nextDate);
  };

  // [Implementation Task, Section 5] Stale-draft resume banner actions.
  // Retomar loads the persisted draft's rows and submission identity
  // into working state; the catalog-merge effect above (keyed on
  // [products]) is unaffected — a product added to the catalog after
  // this draft was last saved simply isn't in `periodicStockDraft.items`
  // yet, so it's merged in here as a fresh blank row, same reasoning as
  // that effect's own merge-only behavior.
  const handleResumeDraft = () => {
    if (!periodicStockDraft) return;
    const nextCatalogRows: CatalogRowState = {};
    const nextManualRows: StockCountWorkingRow[] = [];
    for (const item of periodicStockDraft.items) {
      const row: StockCountWorkingRow = draftItemToWorkingRow(item);
      if (item.productId) {
        nextCatalogRows[item.productId] = row;
      } else {
        nextManualRows.push(row);
      }
    }
    for (const product of products) {
      if (!nextCatalogRows[product.id]) {
        nextCatalogRows[product.id] = buildCatalogRow(product);
      }
    }
    setCatalogRows(nextCatalogRows);
    setManualRows(nextManualRows);
    setType(periodicStockDraft.type);
    setLabel(periodicStockDraft.label || '');
    setDate(periodicStockDraft.date);
    submissionIdRef.current = periodicStockDraft.submissionId || null;
    setDraftSaveState('saved');
    setDraftBannerDismissed(true);
  };

  // Começar de novo — explicit "start over" path (Implementation Task,
  // Section 5), distinct from finalization's own automatic cleanup
  // inside recordStockCount.
  const handleDiscardDraft = async () => {
    setDraftBannerDismissed(true);
    submissionIdRef.current = null;
    try {
      await clearPeriodicStockDraft();
    } catch {
      // Best-effort — if this fails, the stale draft is simply
      // overwritten by the next autosave, or the banner reappears next
      // mount; not a blocking error for the operator's current session.
    }
  };

  const visibleCatalogEntries = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    return Object.entries(catalogRows)
      .filter(([, row]) => !row.removed)
      .filter(([, row]) => !search || row.productName.toLowerCase().includes(search))
      .sort((a, b) => a[1].productName.localeCompare(b[1].productName));
  }, [catalogRows, productSearch]);

  const removedCatalogEntries = useMemo(
    () => Object.entries(catalogRows).filter(([, row]) => row.removed),
    [catalogRows]
  );

  // The full working list — every catalog row (visible, removed, or
  // still-blank alike) plus every manual row — is what actually gets
  // tallied. Search only ever affects what's displayed, never what's
  // counted, so a removed/filtered-out product is never silently
  // dropped from Not Counted.
  const allWorkingRows: StockCountWorkingRow[] = useMemo(
    () => [...Object.values(catalogRows), ...manualRows],
    [catalogRows, manualRows]
  );

  const liveTally = useMemo(() => tallyStockCountRows(allWorkingRows), [allWorkingRows]);

  // [Increment B, Checkpoint B6 — Consolidated Specification §17] Purely
  // presentational, identical reasoning and helper as Checkpoint B5's
  // InitialStockCountView.tsx: identifies which rows share a product
  // name with another row in THIS count (across visible catalog rows
  // AND manual rows combined — a multi-portion product may be split
  // between an auto-populated catalog row and one or more manually
  // added rows, or entirely among manual rows), so they can be visually
  // labeled as portions of one product's count rather than reading as
  // an accidental duplicate. Reuses computePortionLabels unchanged —
  // it is name-based, not productId-based, so it already works
  // correctly across this surface's two-array (catalogRows + manualRows)
  // model with zero changes to the helper itself. Deliberately keyed
  // over `visibleCatalogEntries` (not raw `catalogRows`/`allWorkingRows`)
  // for the catalog half — a removed catalog row is hidden from the
  // main grid entirely (shown only as a small "restore" chip elsewhere)
  // and is always Not Counted, so it is not a live valuation "portion"
  // to label. Manual rows are indexed by their array position for this
  // computation only — never persisted, never compared across renders,
  // recomputed fresh every time exactly like catalog ids are read fresh
  // from `visibleCatalogEntries` every render. Feeds NOTHING into
  // liveTally above, workingRowToDraftItem, or any Firestore write —
  // see stockCountPortionGrouping.ts's own header comment.
  const portionLabels = useMemo(() => {
    const rowsForGrouping = [
      ...visibleCatalogEntries.map(([productId, row]) => ({ id: productId, productName: row.productName })),
      ...manualRows.map((row, idx) => ({ id: `manual-${idx}`, productName: row.productName })),
    ];
    return computePortionLabels(rowsForGrouping);
  }, [visibleCatalogEntries, manualRows]);

  // [Business Worth Evolution — Decision 37, B.3: Multiple
  // Current-Stock Portions + First-Class "+ Adicionar Porção" UX]
  // Reshapes `manualRows` into product-name groups for a
  // one-card-per-product rendering — reuses groupRowsByProductName
  // completely UNCHANGED (the same pure, generic function
  // InitialStockCountView.tsx's own Grouped Initial Stock UX already
  // uses and already tests; this item adds a second CONSUMER of it,
  // never a second grouping RULE). Deliberately scoped to `manualRows`
  // ONLY, not `catalogRows` — a catalog row always represents an
  // already-known product, which by construction never needs the
  // first-time "+ Adicionar Porção" affordance this item adds (an
  // Owner wanting another portion of an already-known product still
  // uses this SAME mechanism, since that product's extra portions are
  // themselves manual rows the moment they're added — the catalog
  // row's own single, auto-populated portion is untouched, exactly as
  // today). Keeping the catalog-row rendering loop itself completely
  // untouched is a deliberate scope boundary (governing instruction
  // §10: "do not silently redesign the whole Contagem screen").
  // Carries `idx` (this render's own position in `manualRows`) rather
  // than spreading the full row, so the renderer can still call the
  // EXISTING updateManualRow(idx, ...)/handleRemoveManualRow(idx)
  // functions with zero adaptation — mirrors this file's own existing
  // `manual-${idx}` convention (portionLabels, immediately above).
  // Recomputed fresh every render from the SAME flat `manualRows`
  // array, exactly like portionLabels already is — there is no
  // separate "group" state to keep in sync.
  const manualRowGroups = useMemo(
    () => groupRowsByProductName(manualRows.map((row, idx) => ({ id: `manual-${idx}`, idx, productName: row.productName }))),
    [manualRows]
  );

  const diff = liveTally.totalPurchaseValue - comparisonBaseline;
  const diffPct = comparisonBaseline > 0 ? (diff / comparisonBaseline) * 100 : 0;

  // Step 1 of 2: validate + compute the tally and hand off to the
  // mandatory Counted/Not Counted confirmation screen (Amendment Part
  // 9) — nothing is saved yet.
  //
  // [Implementation Task, Section 3/4b/7] This is also where the
  // submission identity is generated (once per logical confirmation
  // attempt, reused across retries — regenerated only if
  // submissionIdRef.current was nulled by an edit since the last
  // attempt, per every row/type/date/label handler above) and
  // immediately, durably persisted — never left to the debounced §4a
  // path, which is the one thing handleConfirmSave below is allowed to
  // discard.
  const handleRequestConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (type === 'custom' && !label.trim()) {
      setError('Dê um nome a esta contagem personalizada (ex: "Antes da Época Festiva").');
      return;
    }

    const tally = tallyStockCountRows(allWorkingRows);
    if (tally.countedItems.length === 0) {
      setError('Introduza a quantidade física de pelo menos um produto antes de confirmar.');
      return;
    }
    for (const item of tally.countedItems) {
      if (item.costPrice < 0 || item.sellingPrice < 0) {
        setError(`Introduza um preço válido para "${item.productName}".`);
        return;
      }
    }

    if (!submissionIdRef.current) {
      submissionIdRef.current = 'submission-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);
    }

    // §4a: any not-yet-fired ordinary autosave is about to be
    // superseded by the immediate write below regardless — clear it so
    // it can't fire a second, now-redundant write moments later.
    if (draftDebounceTimerRef.current) {
      clearTimeout(draftDebounceTimerRef.current);
      draftDebounceTimerRef.current = null;
    }

    // [Race guard] Sequence this identity-establishing write strictly
    // after any write already in flight — an ordinary §4a autosave that
    // had already fired before being cancelled above, or a PRIOR
    // identity write from an earlier confirm → back out → edit →
    // reconfirm cycle within this same session. Without this, two
    // overlapping writes to the same draft document could complete out
    // of order, letting a stale one land after the fresh one and
    // silently revert the persisted identity/content — which would
    // defeat §4b's durability guarantee for a crash occurring in that
    // exact narrow window. Both referenced promises already swallow
    // their own errors internally (see their `.catch` handlers below
    // and in scheduleDraftSave), so awaiting them here never throws.
    if (draftInFlightSaveRef.current) {
      await draftInFlightSaveRef.current;
    }
    if (identityWriteRef.current) {
      await identityWriteRef.current;
    }

    // §4b: immediate, non-debounced, full draft write INCLUDING the
    // identity — this is the write handleConfirmSave will always await
    // in full before finalization, never cancel.
    setDraftSaveState('saving');
    const allRows = allWorkingRows.map(workingRowToDraftItem);
    identityWriteRef.current = savePeriodicStockDraft(allRows, type, label.trim() || undefined, date, submissionIdRef.current)
      .then(() => setDraftSaveState('saved'))
      .catch(() => setDraftSaveState('save-failed'));

    setPendingTally(tally);
  };

  // Step 2 of 2: the operator has seen "N contados / M não contados"
  // and explicitly confirmed — now it actually saves.
  //
  // [Implementation Task, Section 4] Ordering, exactly as specified:
  // cancel/await any pending ordinary row-content save (§4a, safe —
  // finalization reads live component state, never the draft), THEN
  // await the identity write in full (§4b, never cancelled), and only
  // then call recordStockCount. By the time fsBatch.commit() is even
  // queued inside recordStockCount, no draft-write promise this
  // component could have in flight remains unresolved.
  const handleConfirmSave = async () => {
    if (!pendingTally) return;
    setIsSaving(true);
    setError(null);
    try {
      if (draftDebounceTimerRef.current) {
        clearTimeout(draftDebounceTimerRef.current);
        draftDebounceTimerRef.current = null;
      }
      if (draftInFlightSaveRef.current) {
        await draftInFlightSaveRef.current;
      }
      if (identityWriteRef.current) {
        await identityWriteRef.current;
      }

      // [Product Memory / UOM — Increment A, Checkpoint 2c; corrected
      // under Decision 37 B.1; extended under B.2 for arbitrary-length
      // chains] Correlated from newProductInfo — the product-level,
      // productKeyFor-keyed state (see its own declaration comment,
      // above) — rather than scanning individual rows for whichever
      // one happened to carry these fields (B.1's own correction) or
      // assuming a fixed two-level chain (B.2's own extension).
      // Re-validated here via isValidUnitRelationship regardless, never
      // trusted merely because the UI fields were non-empty.
      //
      // relationshipSteps[i] contributes units[i + 1] — factor is
      // interpreted as factorFromPrevious for the level IT introduces,
      // exactly Product.unitRelationship.units[]'s own existing,
      // UNCHANGED convention (product-unit-of-measure-specification.md
      // §2). A trailing incomplete step (blank unit and/or factor —
      // the Owner started a level but hasn't finished it) is dropped
      // rather than truncating the whole candidate to zero levels,
      // since UnitRelationshipChainEditor's own "+ Adicionar nível"
      // gating already prevents a genuinely INTERIOR gap from ever
      // being constructed in the first place; only the very last step
      // can ever be incomplete. `sellingUnit` is deliberately left
      // unset — B.2's own scope is the relationship chain only, never
      // a selling-price/reference-unit decision (that remains Mode
      // A/B's own, separately-authorized, unmodified mechanism, which
      // already lets the Owner pick any unit from the full chain as
      // its reference unit — Product.unitRelationship.sellingUnit is
      // optional per isValidUnitRelationship's own contract, unchanged
      // here).
      const unitRelationshipByProductName = new Map<string, UnitRelationship>();
      for (const [key, info] of Object.entries(newProductInfo)) {
        if (!key) continue;
        const completeSteps = info.relationshipSteps.filter(
          (s) => s.unit.trim() && Number.isFinite(parseFloat(s.factor)) && parseFloat(s.factor) > 0
        );
        if (completeSteps.length === 0) continue;
        const fallbackRow = allWorkingRows.find((r) => productKeyFor(r.productName) === key);
        const purchaseUnit = info.purchaseUnit.trim() || fallbackRow?.unit || 'un';
        const candidate: UnitRelationship = {
          units: [
            { unit: purchaseUnit, factorFromPrevious: 0 },
            ...completeSteps.map((s) => ({ unit: s.unit.trim(), factorFromPrevious: parseFloat(s.factor) })),
          ],
          confirmedAt: new Date().toISOString(),
        };
        if (isValidUnitRelationship(candidate)) {
          unitRelationshipByProductName.set(key, candidate);
        }
      }

      const saved = await recordStockCount({
        type,
        label: type === 'custom' ? label.trim() : undefined,
        date,
        items: pendingTally.countedItems.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          // [Product Memory / UOM — Increment A, Checkpoint 2c]
          ...(unitRelationshipByProductName.has(item.productName.trim().toLowerCase())
            ? { unitRelationship: unitRelationshipByProductName.get(item.productName.trim().toLowerCase())! }
            : {}),
          // [Business Worth Evolution — Increment 4, Specification §15,
          // FR-20] Same productName-keyed correlation pattern as
          // unitRelationship immediately above — modeAGroups holding a
          // key for this product means the Owner had Mode A active for
          // it at confirmation time. Display-only (types.ts,
          // StockCountItem.valuationMode's own comment) — never read by
          // any calculation; the item's own sellingPrice above (Mode-A-
          // derived or Mode-B-typed, indistinguishably) is what
          // determines valuation, exactly as it already did before this
          // Increment. Omitted entirely for Mode B, matching this
          // codebase's existing "absence is the default" convention.
          ...(modeAGroups[item.productName.trim().toLowerCase()] ? { valuationMode: 'A' as const } : {}),
        })),
        expectedValueAtCount: expectedCurrentStockValue,
        submissionId: submissionIdRef.current || undefined,
        // [Business Worth Evolution — Implementation Authorization,
        // Increment 8; Specification §25, §26, FR-38, FR-39, FR-58]
        // When this confirmation is a correction/recovery
        // (pendingBusinessWorthCorrection, set only via DashboardView's
        // own eligibility-gated entry point), producesBusinessWorthSnapshot
        // is set true so recordStockCount's own correction/recovery
        // write path actually runs — the target snapshot id and kind
        // are never free-typed here, only ever the value
        // startBusinessWorthCorrection already recorded.
        // firestore.rules independently and authoritatively re-verifies
        // eligibility regardless of what is asserted here.
        ...(pendingBusinessWorthCorrection
          ? {
              producesBusinessWorthSnapshot: true,
              correctionOfSnapshotId: pendingBusinessWorthCorrection.snapshotId,
              correctionKind: pendingBusinessWorthCorrection.kind,
            }
          : {}),
      });
      setSavedTotal(saved.totalValue);
      setSavedTally(pendingTally);
      setSavedMessage(
        pendingBusinessWorthCorrection
          ? 'Correção registada com sucesso!'
          : `Contagem ${TYPE_LABELS[type]} registada com sucesso!`
      );
      setPendingTally(null);
      // [Business Worth Evolution — Implementation Authorization,
      // Increment 8] Correction mode is scoped to exactly one
      // confirmation — cleared here so a later, entirely unrelated
      // Contagem never silently inherits it.
      if (pendingBusinessWorthCorrection) clearBusinessWorthCorrection();
      // [Implementation Task, Section 4b] Finalized — this identity has
      // done its job. A future periodic count (after onComplete moves
      // the operator away from this screen) needs a fresh one; leaving
      // this set would otherwise let a later, entirely unrelated count
      // collide with this one's deterministic stockCounts id.
      submissionIdRef.current = null;
      setTimeout(() => onComplete(), 2200);
    } catch (err: any) {
      setError(err.message || 'Erro ao registar a contagem de stock.');
      setPendingTally(null);
      // Deliberately NOT clearing submissionIdRef.current here — a
      // failed or ambiguous attempt must remain retryable under the
      // SAME identity (§3/§4b). The operator returns to the editing
      // screen; if they click "Rever e Confirmar Contagem" again
      // without editing anything, handleRequestConfirmation reuses this
      // identity rather than generating a new one.
    } finally {
      setIsSaving(false);
    }
  };

  if (savedMessage) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex flex-col items-center text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" strokeWidth={2.25} />
        </div>
        <h2 className="type-title">{savedMessage}</h2>
        <p className="text-sm text-gray-500">
          Valor Físico Total (a custo):{' '}
          <span className="font-display font-semibold text-[#0B1F3A] tabular-nums">
            {formatCurrency(savedTotal, currencySymbol)}
          </span>
        </p>
        {savedTally && (
          <p className="text-xs text-gray-500">
            {savedTally.countedItems.length} produtos contados
            {savedTally.notCountedProductNames.length > 0
              ? ` · ${savedTally.notCountedProductNames.length} não contados`
              : ''}
          </p>
        )}
      </div>
    );
  }

  // Mandatory Counted/Not Counted confirmation (Amendment Part 9) —
  // shown after "Confirmar Contagem" and before anything is actually
  // persisted.
  if (pendingTally) {
    return (
      <div className="max-w-2xl mx-auto py-10 space-y-5">
        {pendingBusinessWorthCorrection && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
            <p className="text-[12.5px] font-bold text-amber-800">
              {pendingBusinessWorthCorrection.kind === 'superadmin-authorized-recovery'
                ? '⚠ A confirmar uma RECUPERAÇÃO de Valor do Negócio (autorizada pelo SuperAdmin) — não uma Contagem normal.'
                : '⚠ A confirmar uma CORREÇÃO da última Contagem — não uma Contagem normal.'}
            </p>
          </div>
        )}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
              <ClipboardList className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="type-title">Confirmar Contagem</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">Reveja antes de guardar — esta contagem é uma fotografia do que existe fisicamente agora.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3.5 text-center">
              <p className="font-display font-semibold text-2xl text-emerald-700 tabular-nums">{pendingTally.countedItems.length}</p>
              <p className="text-[11px] font-semibold text-emerald-700/80 mt-0.5">Produtos Contados</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3.5 text-center">
              <p className="font-display font-semibold text-2xl text-amber-700 tabular-nums">{pendingTally.notCountedProductNames.length}</p>
              <p className="text-[11px] font-semibold text-amber-700/80 mt-0.5">Produtos Não Contados</p>
            </div>
          </div>

          {pendingTally.notCountedProductNames.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-[3px]" strokeWidth={2.25} />
              <p className="text-[12px] leading-relaxed text-amber-800">
                Esta será uma contagem <strong>parcial</strong>. Os produtos não contados não entram no total nem
                recebem quantidade zero — não presuma que ficaram sem stock.
              </p>
            </div>
          )}

          <div className="rounded-xl bg-[var(--muted)] border border-[#E5E7EB] divide-y divide-[#E5E7EB] max-h-64 overflow-y-auto">
            {pendingTally.countedItems.map((item) => (
              <div key={item.productName} className="flex items-center justify-between gap-2 px-4 py-2 text-[12.5px]">
                <span className="text-[#111827] font-medium truncate">{item.productName}</span>
                <span className="text-gray-500 tabular-nums shrink-0">
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))}
          </div>

          <div className="card-dark-gradient rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
            <span className="font-semibold text-white/70 text-[13px]">Valor Total da Contagem</span>
            <span className="font-display font-semibold text-[22px] text-[#D4AF37] tabular-nums leading-none">
              {formatCurrency(pendingTally.totalPurchaseValue, currencySymbol)}
            </span>
          </div>

          {error && (
            <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] font-medium">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPendingTally(null)}
              disabled={isSaving}
              className="btn-secondary flex-1 py-3 px-4 text-sm disabled:opacity-60"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.25} />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={isSaving}
              className="btn-primary flex-1 py-3 px-4 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{isSaving ? 'A guardar...' : 'Confirmar Contagem'}</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Shared field treatment — identical to Initial Stock Count so the two
  // counting screens read as one consistent system.
  const fieldClass =
    'w-full bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-2 text-[13px] text-[#111827] placeholder-gray-400 ' +
    'transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20';
  const fieldLabelClass = 'block type-label mb-1';
  const rowGridClass = 'grid grid-cols-2 sm:grid-cols-[minmax(0,2fr)_84px_76px_112px_112px_120px_28px] gap-x-2.5 gap-y-2.5 sm:items-end';

  // [Implementation Task, Section 5] A draft only counts as "worth
  // resuming" if it actually holds operator-entered content — an empty
  // draft (e.g. one that only ever got as far as an identity-only
  // write, or was created and abandoned before any quantity was typed)
  // isn't worth interrupting the operator's flow with a banner over.
  const draftHasMeaningfulContent = (draft: PeriodicStockDraft | null): boolean =>
    !!draft && draft.items.some((item) => item.quantity.trim() !== '' || (!item.productId && item.productName.trim() !== ''));

  // Gate the main form on resolving the stale-draft banner (§6: never
  // silently auto-loaded) — but only when there's actually something to
  // resolve. `periodicStockDraftLoaded` disambiguates "we don't know
  // yet" (still waiting on Firestore's first snapshot) from "confirmed:
  // no draft," same reasoning as initialStockDraftLoaded.
  const draftDecisionPending =
    periodicStockDraftLoaded && draftHasMeaningfulContent(periodicStockDraft) && !draftBannerDismissed;

  if (subscriptionBlocksNewRecords) {
    return <SubscriptionBlockedNotice />;
  }

  if (!periodicStockDraftLoaded) {
    return (
      <div className="max-w-5xl mx-auto pb-12">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-8 text-center text-sm text-gray-400">
          A verificar contagens por terminar...
        </div>
      </div>
    );
  }

  if (draftDecisionPending && periodicStockDraft) {
    return (
      <div className="max-w-2xl mx-auto py-16 space-y-5">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Undo2 className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="type-title">Contagem por Terminar Encontrada</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Existe uma contagem {TYPE_LABELS[periodicStockDraft.type]} por terminar de{' '}
                {formatDate(periodicStockDraft.date)}.
              </p>
            </div>
          </div>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            Pode retomar de onde parou, ou começar uma contagem nova a partir do zero — os dados desta contagem
            por terminar serão descartados permanentemente.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="btn-secondary flex-1 py-3 px-4 text-sm"
            >
              <span>Começar de Novo</span>
            </button>
            <button
              type="button"
              onClick={handleResumeDraft}
              className="btn-primary flex-1 py-3 px-4 text-sm"
            >
              <span>Retomar Contagem</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-4">
      {/* [Business Worth Evolution — Implementation Authorization,
          Increment 8; Specification §25, §26] Clearly distinguishes a
          correction/recovery from an ordinary Contagem, per the task's
          own explicit requirement — never merely a UI omission the
          Owner could miss. */}
      {pendingBusinessWorthCorrection && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Undo2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="text-[13px] font-bold text-amber-800">
              {pendingBusinessWorthCorrection.kind === 'superadmin-authorized-recovery'
                ? 'Está a recuperar um registo de Valor do Negócio (autorizado pelo SuperAdmin)'
                : 'Está a corrigir a última Contagem'}
            </p>
            <p className="text-[12px] text-amber-700 mt-0.5">
              Esta contagem substitui o registo de Valor do Negócio atual — o registo anterior fica preservado no
              histórico, nunca é editado ou apagado.
            </p>
            <button
              type="button"
              onClick={() => clearBusinessWorthCorrection()}
              className="text-[11.5px] text-amber-800 underline mt-2"
            >
              Cancelar e voltar a uma Contagem normal
            </button>
          </div>
        </div>
      )}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-5 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
            <ClipboardList className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="type-title">Contagem de Stock Periódica</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Registe uma nova contagem física para acompanhar a evolução do seu capital.
            </p>
          </div>
          {/* [Implementation Task, Section 4/§1a] Draft durability status —
              a deliberately distinct UI signal from isSaving/savedMessage
              below, never collapsed into the same indicator (frozen spec
              §1a: "the user's work is durable" and "the final business
              transaction has been committed" must never share a signal). */}
          {draftSaveState !== 'editing' && (
            <span className="text-[11px] text-gray-400 shrink-0 font-medium">
              {draftSaveState === 'saving' && 'A guardar rascunho…'}
              {draftSaveState === 'saved' && 'Rascunho guardado'}
              {draftSaveState === 'save-failed' && (
                <span className="text-rose-500">Falha ao guardar rascunho</span>
              )}
            </span>
          )}
        </div>

        {!hasInitialStockCount && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 flex items-start gap-2.5 text-xs text-gray-700">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-[3px]" strokeWidth={2.25} />
            <p className="leading-relaxed">
              Ainda não definiu o <strong className="text-[#111827] font-semibold">Capital Inicial</strong>. Esta contagem será guardada, mas recomendamos
              registar primeiro o Capital Inicial no Painel para poder comparar corretamente o crescimento do negócio.
            </p>
          </div>
        )}

        <div className="bg-[var(--muted)] border border-[#E5E7EB] rounded-xl px-4 py-3.5 flex items-start gap-2.5">
          <Info className="w-3.5 h-3.5 text-[#0B1F3A]/60 shrink-0 mt-[3px]" strokeWidth={2.25} />
          <p className="text-[12px] leading-relaxed text-gray-600">
            Esta contagem regista o que existe fisicamente em stock agora. Será comparada com o{' '}
            <strong className="text-[#111827] font-semibold">Valor Esperado de Stock</strong> — o Capital Inicial mais o
            valor (a custo) do stock em lote atualmente registado — para mostrar se o valor do seu inventário
            corresponde ao que o sistema esperava.
          </p>
        </div>

        {productsError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3.5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-[3px]" strokeWidth={2.25} />
              <p className="text-[12px] leading-relaxed text-rose-700">
                Não foi possível carregar os produtos. Isto não significa que o seu catálogo esteja vazio.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="shrink-0 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-rose-700 hover:text-rose-900"
            >
              <RotateCw className="w-3.5 h-3.5" strokeWidth={2.25} />
              Tentar novamente
            </button>
          </div>
        )}

        {error && (
          <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleRequestConfirmation} className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-w-2xl">
            <div>
              <label className={fieldLabelClass}>Tipo de Contagem</label>
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as StockCountType)}
                className={`${fieldClass} font-semibold`}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={fieldLabelClass}>Data da Contagem</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`${fieldClass} font-mono tabular-nums`}
              />
            </div>

            {type === 'custom' && (
              <div className="col-span-2 sm:col-span-1">
                <label className={fieldLabelClass}>Nome da Contagem</label>
                <input
                  type="text"
                  placeholder="Ex: Antes do Natal"
                  value={label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  className={fieldClass}
                />
              </div>
            )}
          </div>

          {/* Catalog-populated product grid — Amendment Part 7/11 */}
          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[12.5px] font-bold text-[#111827]">
                Produtos do Catálogo
                <span className="text-gray-400 font-normal ml-1.5">({visibleCatalogEntries.length})</span>
              </p>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={2.25} />
                <input
                  type="text"
                  placeholder="Pesquisar produto..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className={`${fieldClass} pl-8`}
                />
              </div>
            </div>

            {products.length === 0 && !productsError && (
              <p className="text-[12px] text-gray-400 italic mt-3">
                Ainda não tem produtos no catálogo. Adicione um manualmente abaixo.
              </p>
            )}

            {visibleCatalogEntries.length > 0 && (
              <>
                <div className={`hidden sm:grid ${rowGridClass.replace('sm:items-end', '')} pb-2 mb-1 mt-3 border-b border-[#E5E7EB]`}>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Nome</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Qtd</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Unid</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Compra/Un</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Venda/Un</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Valor</span>
                  <span />
                </div>

                <div className="space-y-1">
                  {visibleCatalogEntries.map(([productId, row]) => {
                    const isBlank = row.quantity.trim() === '';
                    const q = isBlank ? 0 : Number(row.quantity) || 0;
                    const c = Number(row.costPrice) || 0;
                    const portionLabel = portionLabels.get(productId) ?? { isMultiPortion: false, portionIndex: 1, portionCount: 1 };
                    // [Business Worth Evolution — Increment 4] Extracted
                    // as its own named boolean, rather than repeating a
                    // second "isMultiPortion, and" style expression in
                    // this loop, specifically so this Increment's own new
                    // gating condition does not alter the COUNT of the
                    // pre-existing conditional-label source pattern the B6
                    // structural regression test
                    // (periodic-stock-portion-grouping-wiring.test.ts)
                    // independently guards ("exactly one conditional label
                    // in the catalog loop and one in the manual loop") —
                    // an existing invariant this Increment does not touch
                    // or reinterpret, only avoids colliding with textually.
                    const isFirstPortionOfMultiPortionGroup = portionLabel.isMultiPortion ? portionLabel.portionIndex === 1 : false;
                    return (
                      <div
                        key={productId}
                        className={`group ${rowGridClass} rounded-xl px-2.5 py-2.5 -mx-2.5 transition-colors duration-150 hover:bg-[#FAFBFC]`}
                      >
                        <div className="col-span-2 sm:col-span-1 flex items-center gap-1">
                          <span className="text-[13px] font-semibold text-[#111827] truncate">{row.productName}</span>
                          {/* [Business Worth Evolution — Decision 37,
                              B.3 completion] Reuses
                              handleAddPortionToManualGroup UNCHANGED —
                              the exact same handler the manual-row
                              cards below already call. Clicking this
                              creates a new manual portion pre-filled
                              with THIS catalogue product's own name, so
                              the Owner never retypes it to add a second
                              (or later) portion of an already-known
                              product — closing the gap the B.3
                              completion investigation identified: only
                              the FIRST additional portion previously
                              required the generic "Adicionar produto
                              que não está no catálogo" workaround.
                              Deliberately does not touch catalogRows,
                              buildCatalogRow, or this row's own fields
                              at all — the catalogue row itself remains
                              exactly what it always was (this
                              product's own, single, auto-populated
                              portion); the new portion joins the
                              EXISTING "Adicionados Manualmente" grouped
                              card below via the SAME manualRowGroups
                              computation, with zero new state and zero
                              new grouping logic. */}
                          <button
                            type="button"
                            onClick={() => handleAddPortionToManualGroup(row.productName)}
                            aria-label={`Adicionar porção de ${row.productName}`}
                            title="Adicionar Porção"
                            className="shrink-0 p-1 rounded-lg text-gray-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:text-[#0B1F3A] hover:bg-[#D4AF37]/10 transition-all duration-150"
                          >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </button>
                        </div>
                        {/* [Increment B, Checkpoint B6 — Consolidated
                            Specification §17] Shown ONLY when this
                            product also has a manually-added portion
                            elsewhere in this same count — makes clear
                            this row is one portion of that product's
                            count, each with its own unit/price basis,
                            never an accidental duplicate. Purely
                            informational; see portionLabels above. */}
                        {portionLabel.isMultiPortion && (
                          <div className="col-span-2 sm:col-span-7 -mt-1 mb-0.5">
                            <p className="text-[10.5px] text-[#B8952F] font-medium leading-snug">
                              Porção {portionLabel.portionIndex} de {portionLabel.portionCount} — mesmo produto, será somado no total
                            </p>
                          </div>
                        )}
                        {/* [Business Worth Evolution — Increment 4,
                            Specification §15] Rendered exactly once per
                            group, on its first portion only, whether that
                            first portion lands in the catalog block (here)
                            or the manual block below — see portionLabels'
                            own combined ordering. Hidden entirely when
                            this product has no confirmed unitRelationship
                            (Mode A is not offerable — never a forced
                            choice, FR-20; Mode B, unaffected, remains the
                            only option exactly as it always has been).
                            Gated on isFirstPortionOfMultiPortionGroup
                            (extracted above) rather than repeating a
                            second copy of that condition here — see
                            that variable's own comment. */}
                        {isFirstPortionOfMultiPortionGroup &&
                          (() => {
                            const key = productKeyFor(row.productName);
                            const relationship = getUnitRelationshipForProductName(row.productName);
                            if (!relationship || !isValidUnitRelationship(relationship)) return null;
                            const config = modeAGroups[key];
                            const referenceUnitOptions = relationship.units.map((u) => u.unit);
                            const effectiveReferenceUnit = config?.referenceUnit || referenceUnitOptions[0] || '';
                            // A portion's unit falling outside the chain
                            // (e.g. Owner typed a non-member unit after
                            // enabling Mode A) does not hide this control —
                            // Mode A stays visibly active with its own
                            // inputs so the Owner can see/fix it; that
                            // specific portion's price is simply left
                            // untouched by applyModeAToGroup (never
                            // fabricated), matching UOM Specification §4
                            // Item 6's existing warn-and-allow discipline.
                            return (
                              <ModeAValuationControl
                                referenceUnitOptions={referenceUnitOptions}
                                active={!!config}
                                referenceUnit={effectiveReferenceUnit}
                                referencePrice={config?.referencePrice || ''}
                                currencySymbol={currencySymbol}
                                allPortionsConvertible={canApplyModeA(collectGroupPortions(key), effectiveReferenceUnit, relationship)}
                                onToggle={(enable) => handleModeAToggle(key, enable)}
                                onChange={(fields) => handleModeAFieldChange(key, fields)}
                              />
                            );
                          })()}

                        <div>
                          <label className={`${fieldLabelClass} sm:hidden`}>Qtd</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Ainda não contado"
                            value={row.quantity}
                            onChange={(e) => updateCatalogRow(productId, { quantity: e.target.value })}
                            className={`${fieldClass} font-mono tabular-nums ${isBlank ? 'placeholder:text-amber-500/70' : ''}`}
                          />
                        </div>

                        <div>
                          <label className={`${fieldLabelClass} sm:hidden`}>Unid</label>
                          <input
                            type="text"
                            placeholder="un"
                            value={row.unit}
                            onChange={(e) => updateCatalogRow(productId, { unit: e.target.value })}
                            className={`${fieldClass} font-mono text-center`}
                          />
                        </div>

                        <div>
                          <label className={`${fieldLabelClass} sm:hidden`}>Compra/Un ({currencySymbol})</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.costPrice}
                            onChange={(e) => updateCatalogRow(productId, { costPrice: e.target.value })}
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
                            onChange={(e) => updateCatalogRow(productId, { sellingPrice: e.target.value })}
                            className={`${fieldClass} font-mono tabular-nums`}
                          />
                        </div>

                        <div className="flex items-end gap-1.5">
                          <div className="flex-1 min-w-0">
                            <label className={`${fieldLabelClass} sm:hidden`}>Valor</label>
                            <div
                              className={`w-full rounded-[10px] px-2.5 py-2 text-[13px] type-number tabular-nums truncate ${
                                isBlank ? 'bg-amber-50 text-amber-600' : 'bg-[#0B1F3A]/[0.04] text-[#0B1F3A]'
                              }`}
                            >
                              {isBlank ? 'Não contado' : formatCurrency(q * c, currencySymbol)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCatalogRow(productId)}
                            aria-label={`Remover ${row.productName}`}
                            className="shrink-0 p-1.5 mb-[1px] rounded-lg text-gray-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {removedCatalogEntries.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-gray-500 mr-1">Removidos desta contagem:</span>
                {removedCatalogEntries.map(([productId, row]) => (
                  <button
                    key={productId}
                    type="button"
                    onClick={() => handleRestoreCatalogRow(productId)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full px-2.5 py-1 transition-colors duration-150"
                  >
                    {row.productName}
                    <RotateCw className="w-2.5 h-2.5" strokeWidth={2.5} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual additions — products not yet in the catalog (Amendment
              Part 13), grouped into one card per product name (Decision
              37, B.3). rowGridClass's own 7-column layout is preserved
              for the shared field row (Qtd/Unid/Compra/Venda/Valor/
              remove) — only the "Nome" column moves up to the card
              header, shown once per card instead of once per portion. */}
          {manualRows.length > 0 && (
            <div>
              <p className="text-[12.5px] font-bold text-[#111827] mb-2">Adicionados Manualmente</p>
              <div className="space-y-3">
                {manualRowGroups.map((group) => {
                  const firstIdx = group.rows[0].idx;
                  const firstRowLabel = portionLabels.get(`manual-${firstIdx}`) ?? { isMultiPortion: false, portionIndex: 1, portionCount: 1 };
                  // Same semantics as before B.3: Mode A is only ever
                  // relevant here when this card's own first portion is
                  // ALSO the group's overall first portion across
                  // catalog+manual combined (i.e. no catalog row shares
                  // this name) — otherwise Mode A already renders on the
                  // catalog side, exactly as it did before this item.
                  const cardIsFirstPortionOfMultiPortionGroup = firstRowLabel.isMultiPortion ? firstRowLabel.portionIndex === 1 : false;
                  const isNewProduct = isGenuinelyNewProductName(group.displayName);
                  return (
                    <div key={group.key || `blank-${firstIdx}`} className="rounded-xl border border-[#E5E7EB] px-2.5 py-2.5 space-y-1.5">
                      <div>
                        <label className={`${fieldLabelClass} sm:hidden`}>Nome</label>
                        <input
                          type="text"
                          placeholder="Ex: Arroz"
                          value={group.displayName}
                          onChange={(e) =>
                            group.key ? handleRenameManualGroup(group.key, e.target.value) : updateManualRow(firstIdx, { productName: e.target.value })
                          }
                          className={`${fieldClass} font-semibold`}
                        />
                      </div>

                      {/* [Business Worth Evolution — Increment 4,
                          Specification §15] Same control, same
                          group-key state, as the catalog-row loop above
                          — rendered here only when this CARD's first
                          portion happens to be the group's overall
                          first portion (i.e. no catalog row exists for
                          this product name yet). Hidden when the
                          product has no confirmed unitRelationship,
                          exactly as before B.3. */}
                      {cardIsFirstPortionOfMultiPortionGroup &&
                        (() => {
                          const key = productKeyFor(group.displayName);
                          const relationship = getUnitRelationshipForProductName(group.displayName);
                          if (!relationship || !isValidUnitRelationship(relationship)) return null;
                          const config = modeAGroups[key];
                          const referenceUnitOptions = relationship.units.map((u) => u.unit);
                          const effectiveReferenceUnit = config?.referenceUnit || referenceUnitOptions[0] || '';
                          return (
                            <ModeAValuationControl
                              referenceUnitOptions={referenceUnitOptions}
                              active={!!config}
                              referenceUnit={effectiveReferenceUnit}
                              referencePrice={config?.referencePrice || ''}
                              currencySymbol={currencySymbol}
                              allPortionsConvertible={canApplyModeA(collectGroupPortions(key), effectiveReferenceUnit, relationship)}
                              onToggle={(enable) => handleModeAToggle(key, enable)}
                              onChange={(fields) => handleModeAFieldChange(key, fields)}
                            />
                          );
                        })()}

                      {/* [Business Worth Evolution — Decision 37, B.1;
                          extended by B.2] Shown ONLY for a genuinely-new
                          product — never re-asked for an already-known
                          one (isGenuinelyNewProductName, unchanged) —
                          and now rendered once per CARD (the card
                          itself already is "once per group", so no
                          separate portionIndex === 1 check is needed
                          here the way the pre-B.3 flat rendering
                          needed). The data lives in newProductInfo,
                          keyed by the product's own name — completely
                          unaffected by how many portions this card has,
                          or which one is visually first. */}
                      {isNewProduct &&
                        (() => {
                          const key = productKeyFor(group.displayName);
                          const info = newProductInfo[key] ?? { purchaseUnit: '', purchaseCost: '', relationshipSteps: [] };
                          const setInfo = (
                            fields: Partial<{ purchaseUnit: string; purchaseCost: string; relationshipSteps: { unit: string; factor: string }[] }>
                          ) =>
                            setNewProductInfo((prev) => ({
                              ...prev,
                              [key]: { ...(prev[key] ?? { purchaseUnit: '', purchaseCost: '', relationshipSteps: [] }), ...fields },
                            }));
                          return (
                            <NewProductInfoPanel
                              productName={group.displayName}
                              currencySymbol={currencySymbol}
                              purchaseUnit={info.purchaseUnit || ''}
                              purchaseCost={info.purchaseCost || ''}
                              onPurchaseUnitChange={(value) => setInfo({ purchaseUnit: value })}
                              onPurchaseCostChange={(value) => setInfo({ purchaseCost: value })}
                              relationshipSteps={info.relationshipSteps || []}
                              onRelationshipStepsChange={(steps) => setInfo({ relationshipSteps: steps })}
                            />
                          );
                        })()}

                      <div className="space-y-1">
                        {group.rows.map(({ idx }) => {
                          const row = manualRows[idx];
                          const portionLabel = portionLabels.get(`manual-${idx}`) ?? { isMultiPortion: false, portionIndex: 1, portionCount: 1 };
                          return (
                            <div key={idx} className={`group ${rowGridClass} rounded-xl px-2.5 py-2 -mx-2.5 transition-colors duration-150 hover:bg-[#FAFBFC]`}>
                              <div className="col-span-2 sm:col-span-1 flex items-center">
                                {/* [Increment B, Checkpoint B6 —
                                    Consolidated Specification §17] Same
                                    informational-only label as before
                                    B.3 — still meaningful when this
                                    card's portions are only PART of a
                                    larger group that also includes a
                                    catalog row. */}
                                {portionLabel.isMultiPortion && (
                                  <p className="text-[10.5px] text-[#B8952F] font-medium leading-snug">
                                    Porção {portionLabel.portionIndex} de {portionLabel.portionCount} — mesmo produto, será somado no total
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className={`${fieldLabelClass} sm:hidden`}>Qtd</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Ainda não contado"
                                  value={row.quantity}
                                  onChange={(e) => updateManualRow(idx, { quantity: e.target.value })}
                                  className={`${fieldClass} font-mono tabular-nums`}
                                />
                              </div>

                              <div>
                                <label className={`${fieldLabelClass} sm:hidden`}>Unid</label>
                                <input
                                  type="text"
                                  value={row.unit}
                                  onChange={(e) => updateManualRow(idx, { unit: e.target.value })}
                                  className={`${fieldClass} font-mono text-center`}
                                />
                              </div>

                              <div>
                                <label className={`${fieldLabelClass} sm:hidden`}>Compra/Un ({currencySymbol})</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={row.costPrice}
                                  onChange={(e) => updateManualRow(idx, { costPrice: e.target.value })}
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
                                  onChange={(e) => updateManualRow(idx, { sellingPrice: e.target.value })}
                                  className={`${fieldClass} font-mono tabular-nums`}
                                />
                              </div>

                              <div className="flex items-end gap-1.5">
                                <div className="flex-1 min-w-0">
                                  <label className={`${fieldLabelClass} sm:hidden`}>Valor</label>
                                  <div className="w-full bg-[#0B1F3A]/[0.04] rounded-[10px] px-2.5 py-2 text-[#0B1F3A] text-[13px] type-number tabular-nums truncate">
                                    {row.quantity.trim() === ''
                                      ? 'Não contado'
                                      : formatCurrency((Number(row.quantity) || 0) * (Number(row.costPrice) || 0), currencySymbol)}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveManualRow(idx)}
                                  aria-label={`Remover porção`}
                                  className="shrink-0 p-1.5 mb-[1px] rounded-lg text-gray-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* [Business Worth Evolution — Decision 37, B.3]
                          THE core new affordance: adds another portion
                          to THIS SAME product, pre-filled with the
                          card's own name — the Owner never retypes it.
                          Replaces, for this exact case, the generic
                          "Adicionar produto que não está no catálogo"
                          workaround below, which remains for starting a
                          genuinely DIFFERENT product. */}
                      <button
                        type="button"
                        onClick={() => handleAddPortionToManualGroup(group.displayName)}
                        className="w-full py-2 px-3 rounded-lg border border-dashed border-[#E5E7EB] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.05] text-gray-500 hover:text-[#0B1F3A] font-bold text-[11.5px] transition-all duration-150 flex items-center justify-center gap-1.5 group"
                      >
                        <Plus className="w-3 h-3 text-[#D4AF37] group-hover:scale-110 transition-transform duration-150" />
                        <span>Adicionar Porção</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleAddManualRow}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#E5E7EB] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.05] text-gray-500 hover:text-[#0B1F3A] font-bold text-[12.5px] transition-all duration-150 flex items-center justify-center gap-2 group"
          >
            <Plus className="w-3.5 h-3.5 text-[#D4AF37] group-hover:scale-110 transition-transform duration-150" />
            <span>Adicionar produto que não está no catálogo</span>
          </button>

          {/* Total + comparison — hero serif figure, comparison line below a
              thin divider so both fit within the same navy surface. */}
          <div className="card-dark-gradient rounded-2xl px-5 py-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-white/70 text-[13px]">Valor Físico Contado até Agora</span>
              <span className="font-display font-semibold text-[22px] sm:text-[24px] text-[#D4AF37] tabular-nums leading-none">
                {formatCurrency(liveTally.totalPurchaseValue, currencySymbol)}
              </span>
            </div>

            {/* [Amendment v1.0] Shown whenever there's a meaningful baseline to
                compare against — i.e. Expected Current Stock Value is nonzero
                (Initial Capital confirmed, or batches already exist). This
                remains the one, aggregate, whole-business exception BDR-0009
                Part 5 explicitly permits — never decomposed per product. */}
            {comparisonBaseline > 0 && (
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
                <span className="text-white/50">
                  vs. Valor Esperado ({formatCurrency(comparisonBaseline, currencySymbol)})
                </span>
                <span
                  className={`type-number tabular-nums flex items-center gap-1 ${
                    diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-white/50'
                  }`}
                >
                  {diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : diff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  {diff >= 0 ? '+' : ''}
                  {formatCurrency(diff, currencySymbol)} ({diffPct >= 0 ? '+' : ''}
                  {diffPct.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary w-full py-3 px-4 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>Rever e Confirmar Contagem {TYPE_LABELS[type]}</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
          </button>
        </form>
      </div>

      {/* History */}
      {pastCounts.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-5 sm:p-6">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-gray-400" strokeWidth={2.25} />
              <span className="font-bold text-sm text-[#111827]">Histórico de Contagens ({pastCounts.length})</span>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {showHistory && (
            <div className="mt-4 space-y-1">
              {pastCounts.map((count) => (
                <div
                  key={count.id}
                  className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 -mx-2.5 transition-colors duration-150 hover:bg-[#FAFBFC]"
                >
                  <div>
                    <p className="text-xs font-bold text-[#111827]">
                      {count.label || TYPE_LABELS[count.type]}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(count.date)} · {count.items.length} produtos</p>
                  </div>
                  <div className="text-right">
                    <span className="type-number text-sm text-[#111827] tabular-nums block">
                      {formatCurrency(count.totalValue, currencySymbol)}
                    </span>
                    {/* [Amendment v1.0, Part 5] Historical snapshot — only
                        present on counts recorded after this amendment;
                        never recalculated from the live formula. */}
                    {typeof count.expectedValueAtCount === 'number' && (
                      <span className="text-[10px] text-gray-500 tabular-nums block mt-0.5">
                        vs. {formatCurrency(count.expectedValueAtCount, currencySymbol)} esperado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
