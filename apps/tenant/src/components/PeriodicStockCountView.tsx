import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, type StockCountReconciliationSignal } from '../context/AppContext';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';
import { getSuggestedUnitsForCategory } from '../data/businessCategories';
import { StockCount, StockCountType, PeriodicStockDraft, UnitRelationship } from '../types';
import { findMostRecentBatchForProduct } from '../lib/restockObservation';
import { tallyStockCountRows, StockCountWorkingRow, StockCountTallyItem, StockCountTallyResult, workingRowToDraftItem, draftItemToWorkingRow } from '../utils/stockCount';
import { isValidUnitRelationship } from '../lib/unitRelationship';
// [Manual data-entry error investigation, Finding 3] Shared with Add
// Stock (AddStockView.tsx) — see that utility's own header comment for
// why this is a shared utility, not duplicated per screen.
import { checkPriceDeviation } from '../lib/priceDeviationCheck';
import { resolveUnitAwarePrice, findLatestRememberedProductMemory, resolveCanonicalProductSellingMemory } from '../lib/productMemoryPriceResolution';
// [Business Worth Evolution — Decision 37, B.1 completion] Same import
// InitialStockCountView.tsx already uses for its own read-only
// relationship-chain display — reused as a pattern, not shared code,
// per this file's own established precedent (see ExistingProductSummary's
// own header comment, below).
import { getConversionFactor } from '../lib/purchaseToSellingConversion';
import { computePortionLabels, groupRowsByProductName } from '../lib/stockCountPortionGrouping';
import { detectShopSwitch } from '../lib/shopSwitchGuard';
// [Feature — reconciliation signal reaching the Owner] The SAME pure,
// independently-tested function calculations.ts already exports for
// exactly this purpose — never a second, separately-invented
// possible-cause derivation.
import { getPossibleReconciliationCauses, type PossibleReconciliationCause } from '../utils/calculations';
// [Business Worth Evolution — Implementation Authorization, Increment 4;
// Specification §15, FR-20-FR-23] The ONLY valuation engine this file
// uses for Mode A — reused exactly as-is, never duplicated. See that
// file's own header comment for the full design-pass resolution of Rule
// 8 open question #1. Mode B needs no import here at all: it is this
// codebase's existing, unconditional, already-shipped per-portion
// sellingPrice entry (every input below, unchanged) — nothing in this
// file's own pre-existing code path is touched to support it.
import { deriveModeAPortionValuations, canApplyModeA, resolveDefaultSellingConfigurationForRow, type ContagemPortionQuantity } from '../lib/contagemMultiUnitValuation';
// [Business Worth Evolution — Increment 10 Item 5 / Post-Implementation
// Correction §25, Specification §15/FR-67; Product Architect
// resolution, 24 August 2026] The SAME shared cost-basis resolver
// AppContext.tsx's recordStockCount uses for persistence — this is
// what guarantees the live preview total below and the persisted
// Contagem can never disagree. See that module's own header comment
// for the full authoritative-cost-basis and fallback rules.
import { buildProductCostBasisMap, type ProductCostBasis } from '../lib/fr67CostBasisConversion';
// [Feature — optional local download of a confirmed Contagem]
// Reuses the SAME PDF/Excel export engine every Relatórios report
// already uses (reports/shared/reportExport.ts) — jsPDF/xlsx are
// loaded dynamically inside that module, so importing these two
// functions here adds nothing to Contagem's own bundle until an
// Owner actually clicks a download button. No new export logic is
// introduced; this file only supplies the data (savedTally, savedTotal,
// savedSellingTotal) and calls the existing, already-tested engine.
import { exportReportPdf, exportReportExcel } from './reports/shared/reportExport';
import { SubscriptionBlockedNotice } from './SubscriptionBlockedNotice';
import {
  ClipboardList,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Info,
  CheckCircle2,
  History,
  ChevronDown,
  ChevronUp,
  Search,
  AlertTriangle,
  RotateCw,
  Undo2,
  X,
  Package,
  Pencil,
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
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-[#0B1F3A] transition-colors duration-150 py-0.5"
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
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-[#0B1F3A] transition-colors duration-150"
      >
        <ChevronUp className="w-3 h-3" strokeWidth={2.5} />
        <span>Relação de unidades (opcional)</span>
      </button>

      <div className="space-y-1.5">
        {steps.map((step, index) => {
          const previousUnitLabel = index === 0 ? purchaseUnit || 'un' : steps[index - 1]?.unit || 'un';
          return (
            <div key={index} className="flex flex-wrap items-end gap-2.5 text-[13px]">
              <span className="text-gray-500 pb-2">
                1 <strong className="text-[#111827]">{previousUnitLabel}</strong> =
              </span>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Quantidade</label>
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
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Unidade</label>
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
        className="flex items-center gap-1.5 text-[13px] font-bold text-[#0B1F3A] hover:text-[#D4AF37] disabled:text-gray-300 disabled:cursor-not-allowed transition-colors duration-150"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Adicionar nível</span>
      </button>

      <p className="text-[13px] text-gray-500 leading-relaxed">
        Deixe em branco se não quiser configurar agora — pode fazê-lo mais tarde na ficha do produto.
      </p>
    </div>
  );
};

// [Business Worth Evolution — Implementation Authorization, Increment 4;
// Specification §15, FR-20] The ONLY new Owner-facing control this
// Increment adds — rendered exactly once per multi-portion product group
// (never per-row), right where that group's existing "Porção X de Y"
// [Implementation Authorization §14 item 5 — Reference Selling
// Configuration as the Default Path] Formerly a checkbox-gated "Mode A"
// toggle; the reference unit/price fields now render unconditionally
// whenever a valid confirmed unit relationship exists (the caller's own
// existing gate, unchanged) — establishing a shared price for a
// multi-unit product is the ordinary, always-available way to price
// it, not a separate mode the Owner must discover and switch on.
//
// A portion becomes independently priced only when the Owner directly
// edits THAT portion's own "Venda/Un" price field — unchanged, Rule 1
// of applySellingConfigurationEditRules, above.
const ModeAValuationControl: React.FC<{
  referenceUnitOptions: string[];
  referenceUnit: string;
  referencePrice: string;
  currencySymbol: string;
  /** True when every current portion's unit is convertible against
   * referenceUnit (canApplyModeA) — false surfaces a non-blocking notice
   * that at least one portion's price was left untouched, never a
   * fabricated conversion (UOM Specification §4 Item 6). */
  allPortionsConvertible: boolean;
  onChange: (fields: Partial<{ referenceUnit: string; referencePrice: string }>) => void;
}> = ({ referenceUnitOptions, referenceUnit, referencePrice, currencySymbol, allPortionsConvertible, onChange }) => {
  return (
    // [Issue 2 — Periodic Contagem Live Selling-Price Readability]
    // col-span-5, matching rowGridClass's corrected five-track
    // template (was 7, for the pre-§44 row) — see rowGridClass's own
    // comment for why.
    <div className="col-span-2 sm:col-span-5 -mt-1 mb-1">
      <p className="text-[13px] font-semibold text-gray-600 mb-1.5">Preço de venda de referência</p>
      <div className="mt-1.5 flex flex-wrap items-end gap-2.5 bg-[var(--muted)] border border-[#E5E7EB] rounded-xl px-3 py-2.5">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 mb-1">Unidade de referência</label>
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
          <label className="block text-[11px] font-bold text-gray-500 mb-1">Preço de venda ({currencySymbol}) por {referenceUnit || 'unidade'}</label>
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
        <p className="text-[13px] text-gray-500 leading-relaxed basis-full">
          O preço de cada porção é calculado automaticamente a partir deste preço único — as quantidades e unidades físicas contadas não são alteradas. Para vender uma porção a um preço diferente, edite o preço dessa porção diretamente.
        </p>
        {!allPortionsConvertible && (
          <p className="text-[13px] text-amber-600 font-medium leading-relaxed basis-full">
            Uma ou mais porções têm uma unidade que não faz parte da relação de unidades confirmada deste produto — o preço dessas porções não foi alterado; introduza-o manualmente.
          </p>
        )}
      </div>
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
// same value), the unit relationship's own root/base unit and its
// chain (purchaseUnit, relationshipSteps, edited via
// UnitRelationshipChainEditor — purchaseUnit is no longer paired with
// a cost value here, per §45 Amendment FR-78/FR-80: the historical/
// original purchase-cost input this panel once also collected is
// removed, since a product new to the SABUSH catalog is not
// necessarily newly purchased), and, since the Decision 37 B.2
// Selling Unit Capture Extension, the owner's selling/valuation unit
// (sellingUnit, sellingUnitOptions), rendered directly below the
// chain editor once at least one complete level exists. Purely
// presentational + the newProductInfo field bindings; introduces no
// new calculation, no change to submission/normalization beyond
// correctly sourcing the relationship steps and selling unit this
// panel already collected, and no change to
// StockCountWorkingRow.unit/quantity/costPrice/sellingPrice. Does NOT
// derive or display any per-level cost (e.g. "312.50 MZN/Emb") — that
// remains explicitly out of scope, deferred to B.4/FR-67.
const NewProductInfoPanel: React.FC<{
  productName: string;
  currencySymbol: string;
  purchaseUnit: string;
  onPurchaseUnitChange: (value: string) => void;
  relationshipSteps: { unit: string; factor: string }[];
  onRelationshipStepsChange: (steps: { unit: string; factor: string }[]) => void;
  // [Decision 37 B.2 Selling Unit Capture Extension — Implementation
  // Authorization §2 items 2/4] `sellingUnitOptions` is the caller's
  // own [purchaseUnit, ...completeSteps.map(s => s.unit)] construction
  // (mirroring ModeAValuationControl's own referenceUnitOptions
  // pattern) — empty until the chain has at least one complete step,
  // which is exactly when this selector should render at all.
  // `sellingUnit` is the caller's already-reset-if-stale effective
  // value, never validated again here — this component is purely
  // presentational, same discipline as every other field on this
  // panel.
  sellingUnitOptions: string[];
  sellingUnit: string;
  onSellingUnitChange: (value: string) => void;
}> = ({
  productName,
  purchaseUnit,
  onPurchaseUnitChange,
  relationshipSteps,
  onRelationshipStepsChange,
  sellingUnitOptions,
  sellingUnit,
  onSellingUnitChange,
}) => {
  return (
    // [Issue 2 — Periodic Contagem Live Selling-Price Readability]
    // col-span-5 — see ModeAValuationControl's identical comment above.
    <div className="col-span-2 sm:col-span-5 -mt-1 mb-1.5 bg-[var(--muted)] border border-[#E5E7EB] rounded-xl px-3 py-3 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#B8952F]">Produto novo</span>
        <span className="text-[13px] font-semibold text-[#111827] truncate">{productName || '—'}</span>
      </div>

      {/* [§45 Amendment FR-78/FR-80; Implementation Authorization §2
          item 1] The "Custo de Compra Original" cost-value input
          (purchase unit + purchase cost, grouped together) is removed:
          "new to the SABUSH catalog" is not "newly purchased" (§45 §4
          item 2), and Periodic Contagem never asks for historical/
          original purchase cost, for any product, first-time or
          otherwise (§45 §7/FR-78, restated). purchaseUnit's own input
          is retained standalone, unrelated to cost — it remains the
          relationship chain's root/base unit, read by
          UnitRelationshipChainEditor's own display below,
          sellingUnitOptions' construction, and the submit-time
          unitRelationship candidate (handleConfirmSave, further below)
          — none of which depend on a cost value. */}
      <div>
        <label className="block text-[11px] font-bold text-gray-500 mb-1">Unidade de compra</label>
        <input
          type="text"
          value={purchaseUnit}
          onChange={(e) => onPurchaseUnitChange(e.target.value)}
          placeholder="Ex: Cx"
          className="w-24 bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-1.5 text-[13px] font-mono text-center focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
        />
      </div>

      <UnitRelationshipChainEditor purchaseUnit={purchaseUnit} steps={relationshipSteps} onChange={onRelationshipStepsChange} />

      {/* [Decision 37 B.2 Selling Unit Capture Extension —
          Implementation Authorization §2 items 2/5] Renders only once
          the chain has at least one complete step (2+ total units) —
          sellingUnitOptions is empty otherwise, exactly the same gate
          a single-functional-unit product already satisfies naturally
          (§3.A: no selector, no relationship, the one unit is simply
          the selling unit). Never forces sellingUnit === purchaseUnit —
          the owner picks any member of the established chain. */}
      {sellingUnitOptions.length > 0 && (
        <div>
          <label className="block text-[11px] font-bold text-gray-500 mb-1">Unidade de venda/avaliação</label>
          <select
            value={sellingUnit}
            onChange={(e) => onSellingUnitChange(e.target.value)}
            className="bg-white border border-[#E5E7EB] rounded-[10px] px-2.5 py-1.5 text-[13px] font-mono focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          >
            <option value="">Selecionar...</option>
            {sellingUnitOptions.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">
            A unidade em que o preço de venda deste produto será registado — pode ser diferente da unidade de compra.
          </p>
        </div>
      )}
    </div>
  );
};

// [Business Worth Evolution — Decision 37, B.1 completion; Plan §B.1,
// Rule 8 Finding FT-4] The read-only counterpart NewProductInfoPanel's
// own Plan text named explicitly but was never actually built when
// B.1 first shipped (Execution Record §37 implemented only the
// editable, genuinely-new-product branch above — "never for an
// already-catalogued product" — leaving nothing rendered in this
// panel's place for an existing product at all). B.1's own text:
// "For an existing product, this panel is replaced by a read-only
// summary line pulling Product.unitRelationship/purchase cost basis
// via the already-existing getUnitRelationshipForProductName/
// findMostRecentBatchForProduct (Finding FT-4 — no new read path
// required)." This completes that already-authorized scope — not a
// new capability, and not B.5 (a separate, still-unstarted item whose
// own Plan text says it needs no new code "beyond B.1's read-only-
// summary branch" — i.e. this one).
//
// Read path: costBasisByProductName (buildProductCostBasisMap,
// already computed above for FR-67) is the exact
// Product.costPrice + Product.unitRelationship.units[0].unit pair
// Finding FT-4 points to — reused verbatim, no new lookup. The
// relationship-chain display mirrors InitialStockCountView.tsx's own
// existing "1 Cx = 4 Emb = 24 Un" read-only pattern (reused as a
// pattern per this file's own established precedent — see
// NewProductInfoPanel's sibling comment above — never imported from
// that file). Purely a display: no state, no onChange, no write path.
//
// Nothing is fabricated when a product has only partial memory (e.g.
// a confirmed relationship but no recorded cost, or vice versa) — each
// half renders independently and is simply omitted, never defaulted,
// when its own data is absent; the whole summary renders nothing at
// all when NEITHER half exists, so a product with no memory yet shows
// no empty box.
const ExistingProductSummary: React.FC<{
  productName: string;
  currencySymbol: string;
  costBasis: ProductCostBasis | undefined;
  relationship: UnitRelationship | undefined;
}> = ({ productName, currencySymbol, costBasis, relationship }) => {
  const hasRelationship = !!relationship && isValidUnitRelationship(relationship);
  const hasCostBasis = !!costBasis && Number.isFinite(costBasis.purchaseCost) && costBasis.purchaseCost >= 0 && !!costBasis.purchaseUnit;
  if (!hasRelationship && !hasCostBasis) return null;
  return (
    // [Issue 2 — Periodic Contagem Live Selling-Price Readability]
    // col-span-5 — see ModeAValuationControl's identical comment above.
    <div className="col-span-2 sm:col-span-5 -mt-1 mb-1.5 bg-[var(--muted)] border border-[#E5E7EB] rounded-xl px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-gray-500">Memória do produto</span>
        <span className="text-[13px] font-semibold text-[#111827] truncate">{productName || '—'}</span>
      </div>
      {hasCostBasis && (
        <p className="text-[12.5px] text-gray-600">
          Custo de compra original:{' '}
          <span className="font-mono font-semibold text-[#111827]">{formatCurrency(costBasis!.purchaseCost, currencySymbol)}</span>
          {' '}/ {costBasis!.purchaseUnit}
        </p>
      )}
      {hasRelationship && (
        <p className="text-[12.5px] text-gray-600 font-mono">
          1 {relationship!.units[0].unit}
          {relationship!.units.slice(1).map((u, i) => {
            const factor = getConversionFactor(relationship!, relationship!.units[0].unit, u.unit);
            return (
              <span key={i}>
                {' '}= <strong className="text-[#111827]">{factor ?? '?'}</strong> {u.unit}
              </span>
            );
          })}
        </p>
      )}
    </div>
  );
};

// [Feature — reconciliation signal reaching the Owner, Owner-requested]
// Maps a PossibleReconciliationCause (calculations.ts) to a
// human-readable Portuguese label carrying its own evidence figure —
// matching this file's existing convention (no i18n/t() anywhere in
// this component; see the header comment at getPossibleReconciliationCauses'
// own import, above). Pure, presentation-only — never re-derives or
// second-guesses the evidence itself, only formats what the pure
// function already computed.
function renderReconciliationCauseLabel(cause: PossibleReconciliationCause, currencySymbol: string): string {
  switch (cause.key) {
    case 'unrecordedExpense':
      return `Despesas registadas desde a última medição: ${formatCurrency(cause.evidenceAmount ?? 0, currencySymbol)}`;
    case 'unrecordedBreakage':
      return `Quebras registadas desde a última medição: ${formatCurrency(cause.evidenceAmount ?? 0, currencySymbol)}`;
    case 'unrecordedLevantamento':
      return `Levantamentos registados desde a última medição: ${formatCurrency(cause.evidenceAmount ?? 0, currencySymbol)}`;
    case 'supplierPaymentNotUpdated':
      return `${cause.evidenceCount ?? 0} dívida(s) a fornecedores por pagar, totalizando ${formatCurrency(cause.evidenceAmount ?? 0, currencySymbol)}`;
    case 'receivablesRequireFollowUp':
      return `${cause.evidenceCount ?? 0} dívida(s) a receber de clientes, totalizando ${formatCurrency(cause.evidenceAmount ?? 0, currencySymbol)}`;
    case 'incorrectStockCount':
      return 'Uma contagem física pode sempre conter um erro de contagem';
    case 'stockNotProperlyRecorded':
      return 'Pode haver stock que não foi devidamente registado (compra, quebra ou venda)';
  }
}

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
    cashPositionDeclarations,
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
    // [Feature — Owner-requested: correction mode must pre-fill the
    // original count's actual data, not start blank] The authoritative
    // link to the exact StockCount being corrected is
    // BusinessWorthSnapshot.sourceStockCountId — never a "most recent
    // by date" guess, which could pick the wrong record (e.g. if an
    // 'initial' count happened more recently, or two counts share a
    // date). Only ever the CURRENT active snapshot in practice —
    // DashboardView only ever renders "Corrigir" for index===0/status
    // 'active' — but read directly here rather than assumed, so this
    // component never silently relies on that invariant holding
    // elsewhere.
    latestActiveBusinessWorthSnapshot,
    // [Feature — reconciliation signal reaching the Owner] Needed by
    // getPossibleReconciliationCauses (calculations.ts) — the SAME
    // live payables/receivables arrays already used everywhere else in
    // this codebase for this purpose, never a second, separately
    // fetched copy.
    payables,
    receivables,
    activeBusinessId,
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
  // BDR-0009 Part 4), never 0. [Implementation Authorization — Existing-
  // Product Selling-Unit / Price-Memory Correction] When a confirmed
  // `unitRelationship.sellingUnit` exists, the unit/sellingPrice default
  // instead prefers that confirmed selling unit — see the two-tier
  // resolution inline below.
  const buildCatalogRow = (product: {
    id: string;
    name: string;
    costPrice?: number;
    sellingPrice?: number;
    unitRelationship?: UnitRelationship;
  }): StockCountWorkingRow => {
    const latestBatch = findMostRecentBatchForProduct(batches, product.id);
    const costPrice = latestBatch ? String(latestBatch.costPrice) : product.costPrice != null ? String(product.costPrice) : '';

    // [Implementation Authorization — Periodic Contagem, Existing-Product
    // Selling-Unit / Price-Memory Correction, §2 item 1] Two-tier
    // resolution: when this product carries a confirmed, valid
    // `unitRelationship.sellingUnit` AND a latest batch exists, default
    // this row's unit to that `sellingUnit` and re-denominate the latest
    // batch's own `(sellingPrice, unit)` into `sellingUnit` terms via the
    // already-existing, already-tested `resolveUnitAwarePrice` — the same
    // function this file already uses for the deviation check
    // (`getRememberedPriceForRow`, above). No new conversion engine. When
    // no confirmed `sellingUnit` exists, when there is no latest batch to
    // convert from, or when `resolveUnitAwarePrice` returns `''` (no
    // valid bridge — should not occur for a confirmed, valid chain, but
    // its own contract guarantees no fabricated number regardless), this
    // falls back to exactly today's behavior: the latest batch's own
    // unit/price, unconverted, or the Product's own reference price with
    // no unit (blank unit) when no batch exists at all. `costPrice`
    // above, and FR-67's own separate `units[0]` cost-basis convention
    // (buildProductCostBasisMap), are entirely untouched by this
    // resolution.
    let unit = latestBatch?.unit ? latestBatch.unit : '';
    let sellingPrice = latestBatch ? String(latestBatch.sellingPrice) : product.sellingPrice != null ? String(product.sellingPrice) : '';

    const relationship = product.unitRelationship;
    const confirmedSellingUnit = isValidUnitRelationship(relationship) ? relationship!.sellingUnit : undefined;
    // [Bug fix — Finding C, fresh audit] Canonical Product selling
    // memory (Product.sellingPrice + Product.unitRelationship.sellingUnit
    // — kept correctly paired by recordStockCount's own Finding B fix)
    // is checked FIRST, before either historical tier below, so a
    // successfully remembered "last deliberately entered" configuration
    // is never silently bypassed by an older, StockBatch-preferring or
    // confirmed-unit/first-match heuristic. Already denominated in
    // confirmedSellingUnit by construction — no conversion needed.
    // Returns null (falls through to the existing tiers, unchanged) only
    // when no confirmed sellingUnit exists yet, or no selling price has
    // ever been remembered for this product at all.
    const canonicalSellingMemory = resolveCanonicalProductSellingMemory(product);
    if (canonicalSellingMemory) {
      unit = canonicalSellingMemory.unit;
      sellingPrice = String(canonicalSellingMemory.sellingPrice);
    } else if (confirmedSellingUnit && latestBatch) {
      const resolved = resolveUnitAwarePrice(latestBatch.sellingPrice, latestBatch.unit || '', confirmedSellingUnit, relationship);
      if (resolved !== '') {
        unit = confirmedSellingUnit;
        sellingPrice = resolved;
      }
      // else: no valid bridge — retain the fallback already computed
      // above (latest batch's own unit/price, unconverted).
    } else if (confirmedSellingUnit && !latestBatch) {
      // [§45 Amendment FR-82; Implementation Authorization §2 item 4]
      // No StockBatch exists for this product at all — the central
      // real-world case this amendment exists to support: a product
      // established purely through a prior confirmed Contagem, never
      // purchased through Add Stock. findLatestRememberedProductMemory
      // (already existing, already tested, reused verbatim — not a new
      // conversion engine) searches confirmed StockCount history (in
      // addition to StockBatch, which is empty here) for this
      // product's own most recent remembered (unit, sellingPrice)
      // pair, preferring a portion already denominated in the
      // confirmed sellingUnit. Converted into sellingUnit terms via the
      // same resolveUnitAwarePrice the batch-present branch above
      // already uses — no second conversion mechanism. Never fabricates
      // a value: findLatestRememberedProductMemory returns null when no
      // memory exists anywhere, in which case unit/sellingPrice retain
      // today's exact final fallback (product.sellingPrice raw, blank
      // unit), computed above.
      const memory = findLatestRememberedProductMemory(product.id, product.name, batches, stockCounts, confirmedSellingUnit);
      if (memory) {
        const resolved = resolveUnitAwarePrice(memory.sellingPrice, memory.unit, confirmedSellingUnit, relationship);
        if (resolved !== '') {
          unit = confirmedSellingUnit;
          sellingPrice = resolved;
        }
      }
    }

    return {
      productId: product.id,
      productName: product.name,
      quantity: '',
      unit,
      costPrice,
      sellingPrice,
      // [FR-89–FR-94, Implementation Authorization §2 item 4] A fresh
      // catalog row always starts by following the product-level
      // default — never deliberate until the Owner directly edits it
      // (updateCatalogRow's own deliberate-entry detection, below).
      // sellingPriceBasisUnit mirrors AddStockView.tsx's own existing
      // convention: set only when there is an actual sellingPrice value
      // to label, matching whichever unit that value is denominated in
      // above (the confirmed sellingUnit when the two-tier resolution
      // fired, or the latest batch's/product's own raw unit otherwise).
      sellingPriceAutoFilled: true,
      ...(sellingPrice !== '' ? { sellingPriceBasisUnit: unit } : {}),
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
  // [Feature — per-row Save + confirm, Owner-requested: validate each
  // product as it's entered instead of only discovering a mistake in
  // the final review, and be able to leave/return mid-count with
  // clear confirmation of what's already been verified] A row is
  // "validated" once its own "Validar" action passed validation —
  // distinct from merely having a quantity typed in (a blank row is
  // legitimately "not yet counted," not an error).
  // [Decision 40 — Validar Workflow, FR-N6; Implementation
  // Authorization §1 item 3] Previously tracked here as two local,
  // non-persistent `useState<Set>` values. Decision 40 replaces that
  // local-only mechanism with a persisted `validated?: boolean` field
  // living directly on each row in `catalogRows`/`manualRows` (see
  // `StockCountWorkingRow.validated`, utils/stockCount.ts), read via
  // `row.validated` at every site that used to consult these two
  // Sets. This is why they no longer exist as separate state here —
  // carrying both a Set and a row field forward would risk the two
  // silently disagreeing; the row field is the single source of
  // truth. The underlying draft autosave (`scheduleRowDraftSave`,
  // below) is unaffected by any of this in kind — it keeps saving the
  // row's current full state regardless of validated status, exactly
  // as it already did for every other field; validating a row is
  // simply one more field write routed through the exact same
  // `updateCatalogRow`/`updateManualRow` path every other edit uses,
  // never a new autosave trigger.
  // Inline validation messages from a failed Save click — shown right
  // on that row, not buried in a final review, so a mistake is visible
  // and fixable the moment it's made.
  const [catalogRowSaveError, setCatalogRowSaveError] = useState<Record<string, string>>({});
  const [manualRowSaveError, setManualRowSaveError] = useState<Record<number, string>>({});
  const [productSearch, setProductSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [savedTotal, setSavedTotal] = useState<number>(0);
  // [Feature — optional local download] The selling-basis counterpart
  // to savedTotal, captured the same way, from the SAME recordStockCount
  // return value — never recomputed independently, so the downloadable
  // receipt can never disagree with what was actually persisted.
  const [savedSellingTotal, setSavedSellingTotal] = useState<number>(0);
  const [savedTally, setSavedTally] = useState<StockCountTallyResult | null>(null);
  // [Feature — reconciliation signal reaching the Owner] Captured the
  // same way as savedTotal/savedSellingTotal, from the SAME
  // recordStockCount return value — undefined on an ordinary
  // confirmation with nothing to report (no snapshot produced, or a
  // snapshot whose difference and every "since" figure were genuinely
  // zero), never a fabricated empty object. The success screen below
  // only renders this section when it is genuinely present.
  const [savedReconciliation, setSavedReconciliation] = useState<StockCountReconciliationSignal | undefined>(undefined);
  // [Feature — optional local download] Holds the pending auto-navigate
  // timer (see the existing `setTimeout(() => onComplete(), 2200)` call
  // below) so a download button can cancel it — without this, clicking
  // "Descarregar" while the countdown fires mid-download would yank the
  // Owner away to the Dashboard before the file finishes generating. A
  // click that DOESN'T touch download is completely unaffected: the
  // timer still fires normally after 2200ms, exactly as before this
  // feature.
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Unmount cleanup: if the Owner navigates away some other way (top
  // nav, browser back) before the 2200ms timer fires, this prevents a
  // stale onComplete() call from firing against an already-unmounted
  // component.
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);
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
  // [Discard-Confirmation Safety Fix — Rule 8 Finding 1, Implementation
  // Authorization §1 item 1] A single click on "Começar de Novo" must
  // never itself discard the draft — it must open a genuine second
  // confirmation step first. 'idle': the original two-button banner.
  // 'confirming': "Começar de Novo" was clicked once; the draft is
  // still fully intact — only "Começar Nova Contagem" from THIS state
  // can proceed to discard. 'discarding': the confirmed delete is in
  // flight (Finding 2's brief loading window) — the confirming action
  // is disabled for this window so a rapid double-click cannot issue a
  // second clearPeriodicStockDraft() call.
  const [discardConfirmState, setDiscardConfirmState] = useState<'idle' | 'confirming' | 'discarding'>('idle');

  // §4a — ordinary row-content autosave. [Decision 39a — Per-Row
  // Autosave Scheduling, Implementation Authorization §1 item 1]
  // Replaces the prior single, shared `draftDebounceTimerRef` with an
  // independent 800ms timer per row (keyed by that row's own stable
  // identity — 'catalog:<productId>', 'manual:<index>',
  // 'newProductInfo:<key>', or the '__meta__' sentinel for count-level
  // fields with no single row of their own: type/label/date, a bulk
  // manual-group rename, or a manual-row add/remove's own structural
  // change). Editing one row's fields clears/reschedules ONLY that
  // row's own entry — never another row's, and never the whole map.
  // Rapid edits to the SAME row continue to collapse into one timer,
  // by construction (the same clear-then-reschedule step, now scoped
  // to one map entry instead of one ref).
  const rowDebounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const draftInFlightSaveRef = useRef<Promise<void> | null>(null);
  // §4b — the one write that must NEVER be discarded: the immediate,
  // non-debounced write that establishes the submission identity
  // (issued from handleRequestConfirmation), always awaited in full by
  // handleConfirmSave before finalization begins.
  const identityWriteRef = useRef<Promise<void> | null>(null);
  // §4c [Decision 38 Amendment; Implementation Authorization §2 items
  // 6-7] — a third kind of pending draft write: the immediate,
  // non-debounced flush fired on interruption (visibilitychange/
  // pagehide, further below). Distinct from both refs above: unlike
  // draftInFlightSaveRef (§4a, safe to discard on confirm) it must
  // also be awaited by handleConfirmSave before finalization, same as
  // identityWriteRef (§4b) — otherwise this new write path could
  // resurrect a draft after finalization, the exact defect shape this
  // Specification exists to prevent, applied to a new write path (Rule
  // 8 Assessment Finding C1).
  const flushInFlightSaveRef = useRef<Promise<void> | null>(null);
  // The submission identity itself (frozen spec §7): generated once on
  // first entry into pendingTally, reused across every retry, cleared
  // by every row/type/date/label-change handler below so that backing
  // out and materially editing regenerates it on the next confirmation
  // attempt, per §7's "last-second edit wins" principle.
  const submissionIdRef = useRef<string | null>(null);

  // [FR-89–FR-94, Implementation Authorization §2 item 4 / Plan §6.2]
  // In-session, monotonically increasing counter — the sole source of
  // "last deliberately entered," never array/row order, never Map
  // iteration order, never a wall-clock timestamp (a debounced autosave
  // write, per rowDebounceTimersRef above, can complete out of order
  // relative to the Owner's own action sequence if captured at write
  // time rather than at the moment of the edit itself — a synchronous,
  // in-memory counter incremented inside the same event handler that
  // marks a row deliberate has no such race). Incremented by
  // nextSellingPriceEditSequence(), below, exactly once per genuine
  // deliberate selling-price/unit edit — never by the automatic default
  // resolution path. Re-seeded on draft resume (the effect that loads a
  // recovered draft, further below) to one past the highest
  // sellingPriceEditSequence found among the resumed rows, so a further
  // deliberate edit in a resumed session continues the correct order
  // rather than colliding with already-stamped values.
  const sellingPriceEditSequenceRef = useRef<number>(0);
  const nextSellingPriceEditSequence = (): number => {
    sellingPriceEditSequenceRef.current += 1;
    return sellingPriceEditSequenceRef.current;
  };

  // [Fix #9 extended — Contagem was the one product-referencing view
  // missing this protection] Same mechanism as AddQuebraView's own
  // guard (src/lib/shopSwitchGuard.ts): a direct Owner switch
  // (ShopSwitcher -> switchShop()) does not remount this component,
  // and `products` here can keep showing the PREVIOUS business's data
  // for a brief window before the new business's Firestore listener
  // delivers its first snapshot. Investigation finding: catalogRows
  // was populated straight from `products` with no such guard at all
  // — a count started (or merely auto-populated, without the Owner
  // typing anything) right after a switch could end up referencing
  // Business A's product IDs while being saved under Business B.
  //
  // Fixed by fully resetting every piece of in-progress-count state on
  // a detected switch (a count fundamentally belongs to one business —
  // there is no sensible way to "carry over" a half-filled count
  // across a switch, mirrors AddStockView's own identical full-reset
  // effect for the same reason) and clearing catalogRows/manualRows in
  // particular. No separate "wait for fresh data" gate is needed
  // beyond that: the catalog-populate effect just below is keyed only
  // on `[products]`, so once catalogRows is cleared here it stays
  // empty until `products` itself receives a genuinely new snapshot —
  // it can never be silently repopulated from the still-stale
  // reference in between.
  const [loadedForBusinessId, setLoadedForBusinessId] = useState<string | null>(activeBusinessId ?? null);
  useEffect(() => {
    const result = detectShopSwitch(activeBusinessId ?? null, loadedForBusinessId);
    if (!result.shouldResetSelection) return;
    setLoadedForBusinessId(result.loadedForBusinessId);

    setType('monthly');
    setLabel('');
    setDate(getTodayDateString());
    setCatalogRows({});
    setManualRows([]);
    // [Decision 40 — Validar Workflow] No separate reset needed for
    // validated status — it lives on each row in `catalogRows`/
    // `manualRows`, both already cleared immediately above.
    setCatalogRowSaveError({});
    setManualRowSaveError({});
    setProductSearch('');
    setError(null);
    setPendingTally(null);
    setDraftSaveState('editing');
    setDraftBannerDismissed(false);
    // [Discard-Confirmation Safety Fix] A business switch mid-
    // confirmation must not leave a stale 'confirming'/'discarding'
    // state pointed at the previous business's draft.
    setDiscardConfirmState('idle');
    setNewProductInfo({});
    submissionIdRef.current = null;
    // [Decision 39a] Clear every pending per-row timer, not a single
    // ref — a count fundamentally belongs to one business, so no
    // per-row timer scheduled against the previous business's rows may
    // survive to fire against the new one.
    rowDebounceTimersRef.current.forEach((timer) => clearTimeout(timer));
    rowDebounceTimersRef.current.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId]);

  // Auto-populate: every Product currently in the catalog gets a
  // working row (BDR-0009 Part 3 — "active" = exists in `products`).
  // Merge-only: a product already represented in `catalogRows` is left
  // untouched so an in-progress count survives the products listener
  // delivering an unrelated update. New products are added with a
  // fresh blank row; a product that no longer exists in `products` at
  // all (hard-deleted) is dropped, since Amendment Part 6 has nothing
  // left to source it from.
  // [Feature — Owner-requested "black list" for discontinued products]
  // A product explicitly marked inactive (Product.active === false, a
  // DIFFERENT concept from the "active = exists in products" language
  // above) is skipped here exactly like a hard-deleted one — dropped
  // from Contagem's catalog list entirely, without deleting anything
  // about the product itself. Reactivating it (see AddStockView) flips
  // Product.active back, at which point this same effect picks it back
  // up on its next run.
  useEffect(() => {
    setCatalogRows((prev) => {
      const next: CatalogRowState = {};
      for (const product of products) {
        if (product.active === false) continue;
        next[product.id] = prev[product.id] || buildCatalogRow(product);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // [Feature — Owner-requested: "view counted products, quantities and
  // totals" after a count is done] Which past count, if any, is
  // currently being viewed in the new read-only detail overlay
  // (rendered near the bottom of this component, alongside the history
  // list). Available for ANY past count, permanently — never gated by
  // the 3-hour correction window, per the Owner's own explicit
  // instruction that already-counted businesses must still be able to
  // view what they counted.
  const [viewingCount, setViewingCount] = useState<StockCount | null>(null);

  // [Bug fix — Owner-reported, real client complaint] Correction mode
  // previously opened a BLANK Contagem screen (every row auto-populated
  // from the current catalog with an empty quantity, via the effect
  // just above) — the Owner had no way to see what they originally
  // counted, so "correcting" one mistake meant blindly re-counting
  // everything from scratch. Confirmed by direct inspection: nothing in
  // this file previously read `mostRecentCount` (declared, below, but
  // otherwise unused) to seed the working rows.
  //
  // Fixed by pre-filling `catalogRows` from the EXACT StockCount this
  // correction targets — found via
  // `latestActiveBusinessWorthSnapshot.sourceStockCountId`, the
  // authoritative link (never a "most recent by date" guess, which
  // could resolve to the wrong record). Runs once per correction
  // session (`correctionPrefillAppliedForRef` below) — critical: this
  // must NOT re-apply on every later render, or it would silently
  // overwrite whatever the Owner has already started correcting the
  // next time `products` happens to change for an unrelated reason.
  //
  // A product that was part of the original count but no longer exists
  // in the current catalog (deleted since) cannot be pre-filled into a
  // catalog row — there is no row for it. This is a disclosed, narrow
  // limitation (surfaced to the Owner via `missingFromCatalogCount`,
  // rendered in the correction banner below), not a silent data loss:
  // nothing about the original StockCount document itself is touched or
  // discarded by this effect, only this session's working-row seeding.
  const correctionPrefillAppliedForRef = useRef<string | null>(null);
  const [correctionPrefillMissingCount, setCorrectionPrefillMissingCount] = useState(0);
  useEffect(() => {
    if (!pendingBusinessWorthCorrection) {
      correctionPrefillAppliedForRef.current = null;
      return;
    }
    if (correctionPrefillAppliedForRef.current === pendingBusinessWorthCorrection.snapshotId) return;
    const sourceStockCountId = latestActiveBusinessWorthSnapshot?.sourceStockCountId;
    if (!sourceStockCountId) return; // no link yet (still loading) — try again next render
    const sourceCount = stockCounts.find((sc) => sc.id === sourceStockCountId);
    if (!sourceCount) return; // source not loaded yet — try again next render

    correctionPrefillAppliedForRef.current = pendingBusinessWorthCorrection.snapshotId;
    let missingCount = 0;
    setCatalogRows((prev) => {
      const next = { ...prev };
      for (const item of sourceCount.items) {
        const existing = next[item.productId];
        if (!existing) {
          missingCount += 1;
          continue;
        }
        next[item.productId] = {
          ...existing,
          quantity: String(item.quantity),
          unit: item.unit || existing.unit,
          costPrice: String(item.costPrice),
          sellingPrice: item.sellingPrice != null ? String(item.sellingPrice) : existing.sellingPrice,
        };
      }
      return next;
    });
    setCorrectionPrefillMissingCount(missingCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingBusinessWorthCorrection, latestActiveBusinessWorthSnapshot, stockCounts, products]);

  // Past counts, most recent first, excluding the 'initial' one (shown separately as baseline)
  const pastCounts = [...stockCounts]
    .filter((s) => s.type !== 'initial')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const mostRecentCount = pastCounts[0] || null;
  // [§44 — Periodic Contagem Cost-Price Removal, FR-74; Rule 8 Finding 4]
  // The local `comparisonBaseline` (Expected Current Stock Value) that
  // used to feed the live entry screen's cost-basis "vs. Valor Esperado"
  // trend indicator is removed along with that indicator — it fed
  // nothing else. `expectedCurrentStockValue` itself (the context value)
  // is unaffected and continues to be passed to recordStockCount's own
  // `expectedValueAtCount` parameter below, preserving the history-list
  // diagnostic (FR-76) exactly as before.

  // [Implementation Task, Section 2/6] Firestore-safe conversion —
  // extracted to utils/stockCount.ts as a pure function (workingRowToDraftItem)
  // so the "blank never becomes zero" property can be proven with a
  // real, runnable unit test rather than only an emulator test.

  // [Decision 39a — Per-Row Autosave Scheduling; Rule 8 Assessment §D;
  // Implementation Plan §1a/§3; Implementation Authorization §1 items
  // 1-3] Replaces the prior scheduleDraftSave. Two changes from the
  // superseded design, both required by the signed authorization:
  //
  // (1) Scheduling is now per-row: `rowKey` identifies WHICH row's
  //     800ms debounce period this call resets — never which version
  //     of the whole draft eventually gets written. Only that row's
  //     own map entry is cleared/rescheduled; every other row's
  //     already-pending timer is untouched, closing the "editing Row B
  //     resets Row A's timer" defect the prior shared-timer design had.
  //
  // (2) The write payload is now read LIVE, at fire-time, from
  //     `latestFlushArgs.current` (declared further below — safe to
  //     reference here despite the later declaration, since this
  //     closure only ever runs ~800ms later, as a macrotask, well
  //     after that declaration has already executed on the same
  //     render) — never from arguments captured at the moment this
  //     function was called. This is the exact property that makes the
  //     T0/T100 race (Row A schedules at T0, Row B edits at T100, Row
  //     A's timer fires afterward) safe: every timer, however early it
  //     was scheduled, always writes whatever is truly current at the
  //     moment it fires — never a stale snapshot that could revert a
  //     newer edit made to a different row after this one was
  //     scheduled. Reuses the exact pattern flushPeriodicDraftNow
  //     already proved correct, applied to every autosave trigger, not
  //     only the interruption flush.
  //
  // draftInFlightSaveRef remains the single, global, unmodified ref it
  // already was — every row's timer, on firing, still awaits it before
  // issuing its own write, exactly as the prior design's stale/
  // out-of-order protection already required. There is still exactly
  // one Firestore document; per-row-ness belongs to scheduling only.
  const scheduleRowDraftSave = (rowKey: string) => {
    const existing = rowDebounceTimersRef.current.get(rowKey);
    if (existing) clearTimeout(existing);
    // `editing`: local changes exist, not yet acknowledged by Firestore
    // (frozen spec §4) — set immediately, before the delay, distinct
    // from `saving` which is reserved for once the write is actually
    // in flight. Remains a single, shared UI signal (Rule 8 §C item
    // 12) — Decision 39 does not require this become per-row.
    setDraftSaveState('editing');
    const timer = setTimeout(async () => {
      rowDebounceTimersRef.current.delete(rowKey);
      // [Decision 38 Amendment, Implementation Task §5c;
      // Implementation Authorization §2 item 4; Decision 39a's own
      // FR-N3] Stale/out-of-order autosave-write serialization: await
      // any prior in-flight periodic-draft write before issuing this
      // one — unchanged in kind from the prior design, now reachable
      // from N possible row timers instead of one shared timer.
      if (draftInFlightSaveRef.current) {
        try {
          await draftInFlightSaveRef.current;
        } catch {
          // A prior write's own failure is already surfaced via its
          // own .catch() below (setDraftSaveState('save-failed')) —
          // swallowed here only so this write still proceeds instead
          // of being blocked by that unrelated rejection.
        }
      }
      setDraftSaveState('saving');
      // [Decision 39a FR-N2 — the required correctness property] Read
      // live, current state HERE, at fire-time — never captured as a
      // function argument at schedule-time.
      const { catalogRows: cr, manualRows: mr, type: t, label: l, date: d, newProductInfo: npi } = latestFlushArgs.current;
      const allRows = [...Object.values(cr), ...mr].map(workingRowToDraftItem);
      const savePromise = savePeriodicStockDraft(
        allRows,
        t,
        l.trim() || undefined,
        d,
        submissionIdRef.current || undefined,
        npi
      )
        .then(() => setDraftSaveState('saved'))
        .catch(() => setDraftSaveState('save-failed'))
        .finally(() => {
          draftInFlightSaveRef.current = null;
        });
      draftInFlightSaveRef.current = savePromise;
    }, 800);
    rowDebounceTimersRef.current.set(rowKey, timer);
  };

  // [FR-89–FR-94, Implementation Authorization §2 items 3–4 / Plan §6.1,
  // §6.2] The single place "deliberate vs. default" is decided — no
  // other code path in this file sets sellingPriceAutoFilled. Shared by
  // updateCatalogRow and updateManualRow, below, so a catalog row and a
  // manual row of an existing product behave identically.
  //
  // Rules, in priority order (Implementation Plan §6.1's own text,
  // Implementation Authorization §6 restated):
  //   1. A direct sellingPrice edit is ALWAYS deliberate, regardless of
  //      whether `fields` also changes `unit` in the same call.
  //   2. A unit-only change (fields touches `unit`, not `sellingPrice`)
  //      on a row that is ALREADY deliberate keeps it deliberate and
  //      leaves sellingPrice/sellingPriceBasisUnit completely untouched
  //      — a physical-unit edit never reinterprets an Owner's own
  //      chosen price into a different unit's terms.
  //   3. A unit-only change on a row still following the default
  //      re-resolves sellingPrice/sellingPriceBasisUnit against the
  //      NEW unit via resolveDefaultSellingConfigurationForRow, staying
  //      non-deliberate. If no valid conversion exists for the new
  //      unit, sellingPrice clears to blank (never fabricated) and the
  //      row stays auto-filled, awaiting either a valid unit or a
  //      direct Owner price entry.
  //   4. Any other field edit (costPrice, removed, quantity, or the
  //      Validar/Editar workflow's own status)
  //      passes through untouched — this function has no opinion on
  //      those fields.
  const applySellingConfigurationEditRules = (
    currentRow: StockCountWorkingRow,
    fields: Partial<StockCountWorkingRow>,
    product: { unitRelationship?: UnitRelationship; sellingPrice?: number } | undefined,
    // [Implementation Authorization §14 item 1/2/4 — Reference Selling
    // Configuration as the Default Path] The product group's own
    // active in-session reference selling configuration, if any — the
    // always-visible control that replaces the former Mode A toggle.
    // `relationship` here is the EFFECTIVE relationship
    // (`getEffectiveUnitRelationshipForProductName`'s own resolution,
    // covering a genuinely new product's in-progress candidate too),
    // not merely `product.unitRelationship` — a brand-new product has
    // no confirmed `product` yet, but can still have an active
    // in-session reference the Owner has just typed.
    groupReference?: { relationship: UnitRelationship | undefined; referenceUnit: string; referencePrice: string },
    // [Implementation Authorization §14 item 4] Set only by the
    // reference control's own write-back (applyModeAToGroup, below) —
    // true means "this sellingPrice write reflects the group's shared
    // reference, not a direct Owner edit to THIS row," so it must never
    // be treated as Rule 1's own deliberate act.
    isReferenceDerivedWrite?: boolean
  ): Partial<StockCountWorkingRow> => {
    if (fields.sellingPrice !== undefined) {
      const newUnit = fields.unit !== undefined ? fields.unit : currentRow.unit;
      if (isReferenceDerivedWrite) {
        // [Implementation Authorization §14 item 4] A write-back from
        // the group's own shared reference is still following a
        // default — the Owner has not directly edited THIS row's own
        // price — so Rule 1 below (reserved for a genuine direct edit)
        // must not fire, and no sellingPriceEditSequence is consumed
        // here (the reference's OWN edit sequence is tracked
        // separately — see handleReferenceConfigChange, below).
        return {
          ...fields,
          sellingPriceAutoFilled: true,
          sellingPriceBasisUnit: newUnit,
        };
      }
      // Rule 1 — a genuine direct edit to this row's own price: always
      // deliberate, regardless of whether `fields` also changes `unit`
      // in the same call.
      return {
        ...fields,
        sellingPriceAutoFilled: false,
        sellingPriceBasisUnit: newUnit,
        sellingPriceEditSequence: nextSellingPriceEditSequence(),
      };
    }

    if (fields.unit !== undefined && fields.unit !== currentRow.unit) {
      if (currentRow.sellingPriceAutoFilled === false) {
        // Rule 2 — already deliberate: physical unit changes, selling
        // configuration untouched.
        return { ...fields };
      }
      // Rule 3 — still following the default: re-resolve against
      // whichever selling configuration is currently authoritative for
      // this product and the NEW unit.
      //
      // [Implementation Authorization §14 item 1/2] Prefer the group's
      // own active in-session reference over the product's static,
      // already-confirmed memory — the in-session reference is what
      // the Owner most recently, explicitly declared for THIS exact
      // Contagem (whether or not it has ever been confirmed before),
      // and must not be silently shadowed by an older, separately-
      // confirmed catalog value, nor left unusable merely because this
      // product has no confirmed value at all yet (closes Gap A, Rule
      // 8 Assessment §17.1).
      const referencePriceNum = groupReference ? Number(groupReference.referencePrice) : NaN;
      const hasActiveReference = !!groupReference?.referenceUnit && Number.isFinite(referencePriceNum) && referencePriceNum >= 0;
      const relationship = hasActiveReference
        ? groupReference!.relationship
        : product?.unitRelationship;
      const confirmedSellingUnit = hasActiveReference
        ? groupReference!.referenceUnit
        : isValidUnitRelationship(relationship) ? relationship!.sellingUnit : undefined;
      const effectiveSellingPrice = hasActiveReference ? referencePriceNum : product?.sellingPrice;
      if (!confirmedSellingUnit || effectiveSellingPrice == null) {
        // No confirmed default AND no active reference exist to
        // resolve against at all — leave sellingPrice exactly as
        // today's pre-FR-89 behavior would (unconverted, unchanged by
        // this unit edit).
        return { ...fields };
      }
      const resolved = resolveDefaultSellingConfigurationForRow(
        { quantity: currentRow.quantity, unit: fields.unit },
        confirmedSellingUnit,
        effectiveSellingPrice,
        relationship
      );
      if (resolved === null) {
        // FR-89's own narrow exception — the new unit is outside the
        // confirmed chain. Clear the price, never fabricate one; stay
        // non-deliberate/auto-filled until the Owner explicitly enters
        // a price (Implementation Authorization §6).
        return { ...fields, sellingPrice: '', sellingPriceBasisUnit: undefined, sellingPriceAutoFilled: true };
      }
      return {
        ...fields,
        sellingPrice: resolved.sellingPrice,
        sellingPriceBasisUnit: resolved.sellingPriceBasisUnit,
        sellingPriceAutoFilled: true,
      };
    }

    // Rule 4 — neither a sellingPrice edit nor a genuine unit change.
    return fields;
  };

  const updateCatalogRow = (
    productId: string,
    fields: Partial<StockCountWorkingRow>,
    // [Implementation Authorization §14 item 4] Set only by
    // applyModeAToGroup's own reference write-back — see
    // applySellingConfigurationEditRules' own `isReferenceDerivedWrite`
    // parameter for the full explanation.
    options?: { isReferenceDerived?: boolean }
  ) => {
    if (!catalogRows[productId]) return;
    // [§7] Any edit after at least one confirmation attempt invalidates
    // the identity that attempt used — the next confirmation generates
    // a fresh one. A no-op before the first attempt (already null).
    submissionIdRef.current = null;
    // [FR-89–FR-94, Implementation Authorization §2 items 3–4] Resolve
    // this row's own product (already-known productId, direct lookup —
    // no name-matching ambiguity for a catalog row) and run the shared
    // deliberate-vs-default rules before merging.
    const product = products.find((p) => p.id === productId);
    // [Implementation Authorization §14 item 1/2] The group's own
    // active in-session reference (always available once a valid
    // relationship exists — no explicit "activate" step) — bundled
    // with the EFFECTIVE relationship (covering a genuinely new
    // product's in-progress candidate too, not merely
    // `product.unitRelationship`).
    const row = catalogRows[productId];
    const groupKey = productKeyFor(row.productName);
    const groupReferenceConfig = getEffectiveReferenceConfig(groupKey);
    const groupReference = {
      relationship: getEffectiveUnitRelationshipForProductName(groupKey),
      referenceUnit: groupReferenceConfig.referenceUnit,
      referencePrice: groupReferenceConfig.referencePrice,
    };
    const resolvedFields = applySellingConfigurationEditRules(row, fields, product, groupReference, options?.isReferenceDerived);
    const nextCatalogRows = { ...catalogRows, [productId]: { ...catalogRows[productId], ...resolvedFields } };
    setCatalogRows(nextCatalogRows);
    // [Decision 39a] Keyed by this row's own stable productId — never
    // resets another catalog row's, or any manual row's, own timer.
    scheduleRowDraftSave(`catalog:${productId}`);
  };

  // [Feature — per-row Save + confirm] One row's worth of the exact
  // same checks handleRequestConfirmation already runs across every
  // counted item at the very end (negative quantity/price rejected;
  // zero is explicitly valid — BDR-0009 Part 4's "Counted vs Not
  // Counted" rule, a zero physical count is a legitimate, deliberate
  // result, e.g. genuinely out of stock, never an error). A still-
  // blank row is never itself rejected here — it simply isn't "ready
  // to confirm" yet, distinct from "confirmed as wrong."
  const validateWorkingRowForSave = (row: StockCountWorkingRow): string | null => {
    if (row.quantity.trim() === '') {
      return 'Introduza a quantidade contada (ou 0, se não há stock deste produto).';
    }
    const qty = parseFloat(row.quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      return 'Introduza uma quantidade válida (0 ou mais).';
    }
    if (row.costPrice.trim() !== '') {
      const cost = parseFloat(row.costPrice);
      if (!Number.isFinite(cost) || cost < 0) return 'Introduza um preço de custo válido.';
    }
    if (row.sellingPrice.trim() !== '') {
      const selling = parseFloat(row.sellingPrice);
      if (!Number.isFinite(selling) || selling < 0) return 'Introduza um preço de venda válido.';
    }
    return null;
  };

  const handleSaveCatalogRow = (productId: string) => {
    const row = catalogRows[productId];
    if (!row) return;
    const message = validateWorkingRowForSave(row);
    if (message) {
      setCatalogRowSaveError((prev) => ({ ...prev, [productId]: message }));
      return;
    }
    // [Feature — Owner-requested] Quantity 0 passes validation (it's a
    // legitimate, deliberate "genuinely out of stock" result — never
    // an error), but is exactly the value most likely to be a genuine
    // slip (an empty field parsed as 0, a stray keystroke). Confirmed
    // explicitly before it's locked in, distinct from every other
    // valid quantity, which saves immediately with no extra step.
    if (parseFloat(row.quantity) === 0 && !window.confirm(`Confirmas que "${row.productName}" tem mesmo 0 em stock?`)) {
      return;
    }
    setCatalogRowSaveError((prev) => {
      if (!(productId in prev)) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    // [Decision 40 — Validar Workflow, FR-N5/FR-N6; Implementation
    // Authorization §1 items 3/9] "Validar" writes `validated: true`
    // onto the row itself via the exact same `updateCatalogRow` path
    // every other field edit already uses — this is what makes the
    // row's existing per-row autosave timer (`scheduleRowDraftSave`,
    // keyed `catalog:${productId}`) pick up and persist this change
    // with no new trigger, and what makes the row leave the active
    // workspace via `visibleCatalogEntries`'s own filter, below,
    // without ever removing it from `catalogRows` itself.
    updateCatalogRow(productId, { validated: true });
  };

  // Re-opening an already-validated row is deliberately gated behind
  // an explicit confirmation — Owner-requested ("queres editar?") —
  // so working through a long list never risks nudging an already-
  // verified product's fields by accident while reaching for the next
  // row's Validar button.
  const handleEditCatalogRow = (productId: string) => {
    if (!window.confirm('Este produto já foi validado. Queres editá-lo?')) return;
    // [Decision 40 — Validar Workflow] Inverse of Validar, above —
    // same write path, same autosave mechanism, no special-casing.
    updateCatalogRow(productId, { validated: false });
  };

  // [Manual data-entry error investigation, Finding 3 — Owner-requested]
  // No price-deviation check existed anywhere in the app — a freshly-
  // typed price was never compared against the product's own
  // remembered price to flag the classic fat-finger typo (an extra or
  // missing zero). Shared with Add Stock (checkPriceDeviation itself),
  // but the "what counts as remembered" source here deliberately
  // mirrors buildCatalogRow's own existing prefill logic exactly
  // (findMostRecentBatchForProduct, falling back to the Product's own
  // static reference price) — never a second, independently-invented
  // memory source, and never the wider findLatestRememberedProductMemory
  // Add Stock uses (which also searches StockCounts) — that would let a
  // Contagem's own just-typed price warn against an EARLIER portion of
  // the SAME Contagem still being entered, which is not what this
  // check is for.
  //
  // Reused for BOTH catalog rows and manual rows (the latter used by
  // "+ Adicionar Porção" on an existing product, or a genuinely new
  // product) — a catalogRows entry always already carries a productId
  // (buildCatalogRow), but a manualRows entry NEVER does (createManualRow
  // sets it undefined unconditionally, matched by name instead — see
  // that function's own comment) even when it represents an existing,
  // already-catalogued product. Resolves by productId when present,
  // falling back to a case-insensitive name match otherwise — the same
  // lookup this file already uses elsewhere (isGenuinelyNewProductName)
  // — so a manual portion of an existing product gets the same
  // protection a catalog row does. Returns null (never a fabricated
  // number) when the row matches no product at all, or the product has
  // no batch and no reference price — checkPriceDeviation's own
  // null-safety then correctly shows no warning at all.
  const getRememberedPriceForRow = (row: StockCountWorkingRow, field: 'cost' | 'selling'): number | null => {
    const trimmedName = row.productName.trim().toLowerCase();
    const product = row.productId
      ? products.find((p) => p.id === row.productId)
      : products.find((p) => p.name.trim().toLowerCase() === trimmedName);
    if (!product) return null;
    const latestBatch = findMostRecentBatchForProduct(batches, product.id);
    if (latestBatch) {
      const rememberedRaw = field === 'cost' ? latestBatch.costPrice : latestBatch.sellingPrice;
      const resolved = resolveUnitAwarePrice(rememberedRaw, latestBatch.unit || row.unit, row.unit, product.unitRelationship);
      return resolved === '' ? null : parseFloat(resolved);
    }
    // No batch — same fallback tier buildCatalogRow itself uses, and
    // (matching that same prefill's own behavior) no unit conversion
    // attempted here either: the Product's own reference price carries
    // no unit of its own to convert from.
    const reference = field === 'cost' ? product.costPrice : product.sellingPrice;
    return reference != null ? reference : null;
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
  const [modeAGroups, setModeAGroups] = useState<Record<string, { referenceUnit: string; referencePrice: string; editSequence?: number }>>({});

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
  // [Decision 37 B.2 Selling Unit Capture Extension — Implementation
  // Authorization §2 item 1] `sellingUnit` extends this same per-product
  // state shape with one additional field: the owner's chosen
  // selling/valuation unit from among the established functional-unit
  // chain, independent of `purchaseUnit`. Defaults to '' (unset) —
  // never defaulted to `purchaseUnit` or `relationshipSteps[0].unit`,
  // since B.2's own single-unit rule and the addendum's independence
  // requirement both forbid inferring a selling unit rather than
  // letting the owner choose it. Reset to '' whenever the current
  // value is no longer among the live chain's units (see the call
  // site's own reset-on-edit effect, further below) — never left
  // silently stale.
  const [newProductInfo, setNewProductInfo] = useState<
    Record<
      string,
      { purchaseUnit: string; relationshipSteps: { unit: string; factor: string }[]; sellingUnit?: string }
    >
  >({});

  // [Decision 38 Amendment — Interruption-durability combined
  // mechanism (§5a); Implementation Authorization §2 item 6]
  // latestFlushArgs mirrors InitialStockCountView.tsx's own
  // `latestFlushArgs`/flush pattern as design precedent ONLY — this is
  // this view's own separate implementation, no code or hook is
  // shared between the two views (frozen spec §5's standing
  // non-authorization, restated at §8 below). Updated on every render
  // so flushPeriodicDraftNow always sees current values without the
  // visibilitychange/pagehide effect needing to re-subscribe on every
  // keystroke (that effect below has an empty dependency array).
  const latestFlushArgs = useRef({ catalogRows, manualRows, type, label, date, newProductInfo });
  latestFlushArgs.current = { catalogRows, manualRows, type, label, date, newProductInfo };

  // §4c / §5a — the interruption-durability flush itself: cancels any
  // pending ordinary autosave (superseded by this immediate write —
  // letting it also fire afterward would just be a redundant, stale
  // write), then issues its own immediate, non-debounced write of the
  // current live state, tracked in flushInFlightSaveRef so
  // handleConfirmSave can await it before finalization (§4c above).
  // This write is safe to have fired even if the operator goes on to
  // confirm normally moments later — finalization (recordStockCount)
  // never reads this Firestore draft, only live component state — its
  // sole purpose is reducing the interruption-loss window, never
  // participating in the finalization data path.
  const flushPeriodicDraftNow = () => {
    // [Decision 39a; Implementation Authorization §1 item 4] Cancel
    // EVERY pending per-row timer, not a single ref — this write is
    // about to supersede all of them at once with the current full
    // state; letting any of them also fire afterward would just be a
    // redundant, stale write racing this one.
    rowDebounceTimersRef.current.forEach((timer) => clearTimeout(timer));
    rowDebounceTimersRef.current.clear();
    const { catalogRows: cr, manualRows: mr, type: t, label: l, date: d, newProductInfo: npi } = latestFlushArgs.current;
    const allRows = [...Object.values(cr), ...mr].map(workingRowToDraftItem);
    setDraftSaveState('saving');
    const flushPromise = savePeriodicStockDraft(allRows, t, l.trim() || undefined, d, submissionIdRef.current || undefined, npi)
      .then(() => setDraftSaveState('saved'))
      .catch(() => setDraftSaveState('save-failed'))
      .finally(() => {
        flushInFlightSaveRef.current = null;
      });
    flushInFlightSaveRef.current = flushPromise;
  };

  // [Decision 38 Amendment §5a item 1] `visibilitychange` (tab hidden
  // — covers switching tabs, minimizing, and is the most reliable
  // signal on mobile) and `pagehide` (covers an actual reload/close/
  // navigation) rather than `beforeunload`, which mobile Safari and
  // some other browsers don't reliably fire at all — the same two
  // events, for the same reason, InitialStockCountView.tsx already
  // uses (design precedent only). This is a best-effort,
  // fire-and-forget write: the browser gives no guarantee it completes
  // once the page is actually gone, and if an instantaneous power loss
  // occurs before this fires and before the edit was locally enqueued,
  // no client-side mechanism can guarantee recovery of that edit (Rule
  // 8 Assessment §7/§10; Implementation Authorization §6) — this
  // narrows that loss window, it does not close it.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPeriodicDraftNow();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', flushPeriodicDraftNow);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', flushPeriodicDraftNow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // [Decision 39b — SPA/In-App Navigation Durability; Rule 8 Assessment
  // §E; Implementation Plan §1c; Implementation Authorization §1 item
  // 6] `visibilitychange`/`pagehide`, above, cover a real browser-level
  // tab close/reload/switch — but this app has no router:
  // PeriodicStockCountView is rendered behind a plain
  // `activeTab === 'stock-count'` conditional in App.tsx, so switching
  // to another section is a genuine React unmount with NEITHER browser
  // event firing (the document never becomes hidden, no page unload
  // occurs). This third, independent trigger closes that gap by
  // calling the SAME flushPeriodicDraftNow function, completely
  // unmodified — no new write-construction logic here at all. Safe
  // against stale closures for the identical reason the two browser-
  // level triggers already are: flushPeriodicDraftNow reads
  // latestFlushArgs.current (updated unconditionally on every render)
  // and already cancels every pending per-row timer (Decision 39a)
  // before issuing its own authoritative write of the true current
  // state — an unmount-triggered call is functionally indistinguishable
  // from a pagehide-triggered one from that function's own point of
  // view. This is a plain function-cleanup effect, never a router or
  // navigation-guard mechanism — App.tsx's own `activeTab` handling is
  // untouched.
  useEffect(() => {
    return () => {
      flushPeriodicDraftNow();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getUnitRelationshipForProductName = (name: string) => {
    const trimmed = productKeyFor(name);
    if (!trimmed) return undefined;
    return products.find((p) => p.name.toLowerCase() === trimmed)?.unitRelationship;
  };

  // [Bug fix — Mode A unavailable for a genuinely new product] Both
  // ModeAValuationControl render sites previously called
  // getUnitRelationshipForProductName ALONE, which only ever looks at
  // the SAVED catalog (`products`) — so for a product still being
  // entered in THIS SAME Contagem (no Product document exists yet;
  // its chain lives only in newProductInfo's in-progress panel state),
  // that lookup always returned undefined, and Mode A's own
  // `if (!relationship) return null` guard silently hid the entire
  // control. An Owner typing a brand-new multi-unit product — exactly
  // the "PRODUTO NOVO" case (a live screenshot's own "Lite 330ml" /
  // "2m 550ml") — could therefore never see Mode A at all, no matter
  // how the unit relationship was configured, and had no choice but to
  // hand-convert the reference price into every other unit themselves
  // (the exact 1400-vs-correct-1440 slip that surfaced this).
  //
  // Fixed by falling back to the SAME newProductInfo-derived candidate
  // relationship handleConfirmSave already builds and persists at
  // submit time (unitRelationshipByProductName, further below in this
  // file) — reusing that exact construction so the live Mode A preview
  // and the eventually-persisted relationship can never disagree, per
  // this codebase's own established "one calculation path" discipline
  // (mirrors getCostBasisForSuppression's own existing dual-source
  // pattern: confirmed catalog relationship first, then the in-progress
  // newProductInfo candidate for a product that doesn't exist as a
  // Product record yet).
  const getEffectiveUnitRelationshipForProductName = (name: string): UnitRelationship | undefined => {
    const existing = getUnitRelationshipForProductName(name);
    if (existing && isValidUnitRelationship(existing)) return existing;

    const key = productKeyFor(name);
    if (!key) return undefined;
    const info = newProductInfo[key];
    if (!info) return undefined;

    const completeSteps = info.relationshipSteps.filter(
      (s) => s.unit.trim() && Number.isFinite(parseFloat(s.factor)) && parseFloat(s.factor) > 0
    );
    if (completeSteps.length === 0) return undefined;

    const purchaseUnit = info.purchaseUnit.trim() || 'un';
    // [Decision 37 B.2 Selling Unit Capture Extension — Implementation
    // Authorization §2 item 3] Only ever included when it's still a
    // live member of THIS candidate's own chain — never passed through
    // stale. Passing a stale/no-longer-member value straight to
    // isValidUnitRelationship would reject the WHOLE candidate (its own
    // §73-86 membership check), not just the selling unit — exactly the
    // silent-breakage this guard exists to prevent.
    const candidateUnits = [purchaseUnit, ...completeSteps.map((s) => s.unit.trim())];
    const effectiveSellingUnit = info.sellingUnit && candidateUnits.includes(info.sellingUnit) ? info.sellingUnit : undefined;
    const candidate: UnitRelationship = {
      units: [
        { unit: purchaseUnit, factorFromPrevious: 0 },
        ...completeSteps.map((s) => ({ unit: s.unit.trim(), factorFromPrevious: parseFloat(s.factor) })),
      ],
      ...(effectiveSellingUnit ? { sellingUnit: effectiveSellingUnit } : {}),
      confirmedAt: new Date().toISOString(),
    };
    return isValidUnitRelationship(candidate) ? candidate : undefined;
  };

  // [Business Worth Evolution — Decision 37, B.4: Cost-Field Suppression
  // on Non-Purchase-Unit Portions] Per Implementation Authorization §36
  // item 4 and Plan Amendment §B.4 verbatim: "once a product-level cost
  // basis + unit relationship exist (B.1/B.2), hide/disable the
  // per-portion costPrice input for any portion whose unit differs from
  // the product's purchase unit... No new calculation lives here — this
  // item is UI-only; the actual Total Cost Value figure is produced by
  // the already-planned FR-67 code change in stockCount.ts" (not this
  // item's scope, and not yet implemented in this codebase). This
  // function therefore only ever answers "should this portion's cost
  // field be suppressed?" — it never computes, fabricates, or returns a
  // cost value.
  //
  // Two cost-basis sources, mirroring B.1/B.2's own existing split:
  //  - an EXISTING catalogued product: cost basis + relationship already
  //    live on the Product record itself (getUnitRelationshipForProductName,
  //    unchanged).
  //  - a GENUINELY NEW product still being entered in this Contagem:
  //    cost basis + relationship live in B.1/B.2's own newProductInfo
  //    panel state. The "complete step" filter below mirrors, but does
  //    not modify or duplicate the authority of, the identical filter the
  //    submit-time unitRelationshipByProductName correlation loop already
  //    uses (see its own comment, further below) — this is a read-only,
  //    presentation-time check, never a second candidate-construction path.
  const getCostBasisForSuppression = (productName: string): { purchaseUnit: string } | null => {
    const existingRelationship = getUnitRelationshipForProductName(productName);
    if (existingRelationship && isValidUnitRelationship(existingRelationship)) {
      const purchaseUnit = existingRelationship.units[0]?.unit?.trim();
      if (purchaseUnit) return { purchaseUnit };
    }

    return null;
  };

  // A portion's cost field is suppressed only once a cost basis +
  // relationship exist (above) AND this specific portion's own unit is
  // not the purchase unit itself — the purchase-unit portion's cost
  // remains the one place the original cost basis is actually visible
  // and editable, exactly as Decision 37's own example (Coca-Cola/CX)
  // describes.
  const isCostFieldSuppressed = (productName: string, portionUnit: string): boolean => {
    const basis = getCostBasisForSuppression(productName);
    if (!basis) return false;
    const trimmedPortionUnit = portionUnit.trim();
    if (!trimmedPortionUnit) return false;
    return trimmedPortionUnit.toLowerCase() !== basis.purchaseUnit.toLowerCase();
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
  // [Implementation Authorization §14 item 2 — Reference Selling
  // Configuration as the Default Path] Pure computation of what a
  // product group's reference selling configuration would default to
  // if the Owner has never explicitly set one this session — the
  // IDENTICAL two-tier resolution the former `handleModeAToggle`
  // performed at explicit toggle-on time (Implementation Authorization
  // — Existing-Product Selling-Unit / Price-Memory Correction, §2
  // items 2-3), now computed on demand rather than only upon an
  // explicit Owner click. No state write here — `getEffectiveReferenceConfig`,
  // immediately below, is what callers actually use; this function is
  // the "no Owner override yet" branch of that resolution.
  const computeDefaultReferenceConfig = (productKey: string): { referenceUnit: string; referencePrice: string } => {
    const relationship = getEffectiveUnitRelationshipForProductName(productKey);
    // Two-tier default: prefer the confirmed `sellingUnit` (when present
    // and a chain member — already guaranteed by isValidUnitRelationship
    // for a confirmed relationship) over `units[0]`, falling back to the
    // latter exactly as today when no `sellingUnit` is confirmed.
    // Identical preference order to buildCatalogRow's own resolution,
    // and to both ModeAValuationControl render sites' own
    // effectiveReferenceUnit computation, below — every default
    // computation in this file can never disagree.
    const defaultReferenceUnit = relationship?.sellingUnit || relationship?.units?.[0]?.unit || '';
    // Seed the reference price from the SAME resolution buildCatalogRow
    // performs for this exact product/unit pair — not a second,
    // independently-computed value. Only for an already-catalogued
    // product with a latest batch to convert from; a genuinely new
    // product (no Product record yet) has no batch, so this remains ''
    // exactly as before this correction — new-product behavior is
    // unaffected.
    let defaultReferencePrice = '';
    const product = products.find((p) => productKeyFor(p.name) === productKey);
    if (product && defaultReferenceUnit) {
      // Same canonical-memory-first priority as buildCatalogRow's own
      // resolution, above — checked before either historical tier, so
      // this function's own "seeded from the SAME resolution... can
      // never disagree" guarantee actually holds.
      const canonicalSellingMemory = resolveCanonicalProductSellingMemory(product);
      if (canonicalSellingMemory && canonicalSellingMemory.unit === defaultReferenceUnit) {
        defaultReferencePrice = String(canonicalSellingMemory.sellingPrice);
      } else {
        const latestBatch = findMostRecentBatchForProduct(batches, product.id);
        if (latestBatch) {
          const resolved = resolveUnitAwarePrice(latestBatch.sellingPrice, latestBatch.unit || '', defaultReferenceUnit, relationship);
          if (resolved !== '') defaultReferencePrice = resolved;
        } else {
          // No StockBatch exists for this product — same no-batch case
          // buildCatalogRow's own new tier handles. Reuses the
          // identical findLatestRememberedProductMemory resolution (not
          // a second, independently-computed value) so this default and
          // buildCatalogRow's own render-time default can never
          // disagree.
          const memory = findLatestRememberedProductMemory(product.id, product.name, batches, stockCounts, defaultReferenceUnit);
          if (memory) {
            const resolved = resolveUnitAwarePrice(memory.sellingPrice, memory.unit, defaultReferenceUnit, relationship);
            if (resolved !== '') defaultReferencePrice = resolved;
          }
        }
      }
    }
    return { referenceUnit: defaultReferenceUnit, referencePrice: defaultReferencePrice };
  };

  // [Implementation Authorization §14 item 2] The single source of
  // truth every call site in this file consults for "what is this
  // product group's active reference selling configuration right now"
  // — the Owner's own explicit edit (`modeAGroups[productKey]`) when
  // one exists, otherwise the computed default, immediately above.
  // Always available whenever a valid relationship exists (no more
  // explicit "activate" step) — this is what makes the reference
  // fields always-visible/always-live rather than toggle-gated.
  const getEffectiveReferenceConfig = (productKey: string): { referenceUnit: string; referencePrice: string; editSequence?: number } =>
    modeAGroups[productKey] ?? computeDefaultReferenceConfig(productKey);

  const applyModeAToGroup = (productKey: string, referenceUnit: string, referencePriceRaw: string) => {
    const referencePrice = Number(referencePriceRaw);
    if (!referenceUnit || !Number.isFinite(referencePrice)) return;
    // [Bug fix — Mode A unavailable for a genuinely new product] Was
    // getUnitRelationshipForProductName alone (catalog-only) — see
    // that helper's own sibling comment, above, for the full
    // explanation. Without this, the render-gating fix above would
    // have let the control APPEAR for a new product while every
    // reference-price entry silently did nothing (derivedSellingPrice
    // always null, since the underlying relationship was always
    // undefined here) — the write path needs the exact same fallback
    // as the render path, not just the render path alone.
    const relationship = getEffectiveUnitRelationshipForProductName(productKey);
    const portions = collectGroupPortions(productKey);
    if (!portions.length) return;
    const derived = deriveModeAPortionValuations(portions, referenceUnit, referencePrice, relationship);
    for (const d of derived) {
      if (d.derivedSellingPrice === null) continue;
      // [Implementation Authorization §14 item 4] This write-back
      // reflects the group's shared reference, not a direct edit to
      // any one row's own price — `isReferenceDerived: true` keeps the
      // affected row `sellingPriceAutoFilled: true` (Rule 8 Assessment
      // §17.4's own justification: a row still following the shared
      // default must keep re-resolving correctly if its own physical
      // unit is later edited).
      if (d.id.startsWith('catalog:')) {
        updateCatalogRow(d.id.slice('catalog:'.length), { sellingPrice: String(d.derivedSellingPrice) }, { isReferenceDerived: true });
      } else if (d.id.startsWith('manual:')) {
        updateManualRow(Number(d.id.slice('manual:'.length)), { sellingPrice: String(d.derivedSellingPrice) }, { isReferenceDerived: true });
      }
    }
  };

  // [Implementation Authorization §14 item 3/7 — Reference Selling
  // Configuration as the Default Path] Handles the Owner directly
  // editing the now-always-visible reference unit/price fields —
  // replaces `handleModeAFieldChange`'s former name only; behavior is
  // unchanged for the fields themselves, plus one addition: a genuine
  // edit to the reference PRICE consumes the same shared
  // `sellingPriceEditSequence` counter every direct row edit already
  // uses (Rule 1, `applySellingConfigurationEditRules`, above), so a
  // reference-price declaration and a later/earlier direct row
  // override are ordered fairly in the memory tie-break
  // (`selectSellingMemoryByProductName`, §14 item 7).
  const handleReferenceConfigChange = (productKey: string, fields: Partial<{ referenceUnit: string; referencePrice: string }>) => {
    setModeAGroups((prev) => {
      const current = prev[productKey] ?? computeDefaultReferenceConfig(productKey);
      const nextConfig = {
        ...current,
        ...fields,
        ...(fields.referencePrice !== undefined ? { editSequence: nextSellingPriceEditSequence() } : {}),
      };
      const next = { ...prev, [productKey]: nextConfig };
      applyModeAToGroup(productKey, nextConfig.referenceUnit, nextConfig.referencePrice);
      return next;
    });
  };

  const updateManualRow = (
    index: number,
    fields: Partial<StockCountWorkingRow>,
    // [Implementation Authorization §14 item 4] See updateCatalogRow's
    // own identical parameter, above.
    options?: { isReferenceDerived?: boolean }
  ) => {
    submissionIdRef.current = null;
    // [FR-89–FR-94, Implementation Authorization §2 items 3–4] A manual
    // row never carries productId (existing, unmodified convention) —
    // resolved by case-insensitive name match, the same dual-resolution
    // getRememberedPriceForRow already uses, so a manual portion of an
    // existing product gets the identical deliberate-vs-default
    // treatment a catalog row does.
    const currentRow = manualRows[index];
    let resolvedFields = fields;
    if (currentRow) {
      const trimmedName = currentRow.productName.trim().toLowerCase();
      const product = currentRow.productId
        ? products.find((p) => p.id === currentRow.productId)
        : products.find((p) => p.name.trim().toLowerCase() === trimmedName);
      // [Implementation Authorization §14 item 1/2] See
      // updateCatalogRow's own identical resolution, above — a manual
      // portion of an existing (or genuinely new, in-progress) product
      // gets the identical active-reference treatment a catalog row
      // does.
      const groupKey = productKeyFor(currentRow.productName);
      const groupReferenceConfig = getEffectiveReferenceConfig(groupKey);
      const groupReference = {
        relationship: getEffectiveUnitRelationshipForProductName(groupKey),
        referenceUnit: groupReferenceConfig.referenceUnit,
        referencePrice: groupReferenceConfig.referencePrice,
      };
      resolvedFields = applySellingConfigurationEditRules(currentRow, fields, product, groupReference, options?.isReferenceDerived);
    }
    const nextManualRows = manualRows.map((row, i) => (i === index ? { ...row, ...resolvedFields } : row));
    setManualRows(nextManualRows);
    // [Decision 39a] Keyed by this row's own array index — matching
    // `manualRowSaveError`'s own existing identity scheme (§2 of the
    // Implementation Plan). Never resets another manual row's, or any
    // catalog row's, own timer.
    scheduleRowDraftSave(`manual:${index}`);
  };

  const handleAddManualRow = () => {
    submissionIdRef.current = null;
    const nextManualRows = [...manualRows, createManualRow()];
    setManualRows(nextManualRows);
    // [Decision 39a] A structural add, not one existing row's own
    // content edit — scheduled under the shared '__meta__' key, same
    // as type/label/date changes below.
    scheduleRowDraftSave('__meta__');
  };

  // [Bug fix — same class as AddStockView's/InitialStockCountView's own
  // identical fix: a row delete button with no confirmation, sitting
  // right next to other interactive fields, could permanently discard
  // typed quantity/price data on a single misclick] Only prompts when
  // there's real data to lose — a still-blank manually-added row
  // removes instantly, same as before.
  const handleRemoveManualRow = (index: number) => {
    const row = manualRows[index];
    if (
      row &&
      (row.productName.trim() || row.quantity || row.costPrice || row.sellingPrice) &&
      !window.confirm('Remover esta porção? Os dados já preenchidos (quantidade, preços) serão perdidos.')
    ) {
      return;
    }
    submissionIdRef.current = null;
    const nextManualRows = manualRows.filter((_, i) => i !== index);
    setManualRows(nextManualRows);
    // [Decision 39a; Implementation Authorization §1 item 5] Re-index
    // the manual-row timer map FIRST — mirroring
    // `manualRowSaveError`'s own existing pattern immediately below,
    // exactly (same i < index / i > index shift) — so a pending timer
    // scheduled against a later row never
    // ends up firing under a now-reused, different row's index. The
    // removed row's own timer (if any) is cancelled outright; every
    // later row's timer is re-keyed, never cancelled, so its own
    // pending edit is not lost, only correctly re-addressed.
    const removedKey = `manual:${index}`;
    const removedTimer = rowDebounceTimersRef.current.get(removedKey);
    if (removedTimer) clearTimeout(removedTimer);
    rowDebounceTimersRef.current.delete(removedKey);
    const shifted = new Map<string, ReturnType<typeof setTimeout>>();
    rowDebounceTimersRef.current.forEach((timer, key) => {
      const match = /^manual:(\d+)$/.exec(key);
      if (!match) {
        shifted.set(key, timer);
        return;
      }
      const i = Number(match[1]);
      if (i < index) shifted.set(key, timer);
      else if (i > index) shifted.set(`manual:${i - 1}`, timer);
      // i === index already handled (cancelled) above.
    });
    rowDebounceTimersRef.current = shifted;
    scheduleRowDraftSave('__meta__');
    // [Feature — per-row Save + confirm] `manualRowSaveError` is keyed
    // by array index, same as every other manual-row identity in this
    // file (updateManualRow, this function itself) — removing a row
    // shifts every LATER index down by one, so this map is re-indexed
    // here or a later row's error status would silently attach to the
    // wrong row after this deletion.
    // [Decision 40 — Validar Workflow, FR-N9; Implementation
    // Authorization §1 items 4/8] `validated` status needs NO
    // equivalent re-indexing block here — it was moved off a
    // parallel, index-keyed Set (`confirmedManualRowIndices`, removed)
    // and onto the row object itself (`StockCountWorkingRow.validated`).
    // `manualRows.filter((_, i) => i !== index)`, above, already
    // carries each remaining row's own `validated` flag forward with
    // it automatically, exactly like it already carries `quantity`/
    // `costPrice`/every other field — this is the concrete
    // simplification Rule 8 §C/this Plan's §1c named as the reason to
    // store validated state on the row rather than in a Set.
    setManualRowSaveError((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const i = Number(key);
        if (i < index) next[i] = value;
        else if (i > index) next[i - 1] = value;
      });
      return next;
    });
  };

  // [Feature — per-row Save + confirm] Manual-row counterpart to
  // validateWorkingRowForSave/handleSaveCatalogRow/handleEditCatalogRow
  // above — identical rules and identical "queres editar?" gate,
  // applied to a manually-added (not-yet-catalog) product instead.
  const handleSaveManualRow = (index: number) => {
    const row = manualRows[index];
    if (!row) return;
    const message = validateWorkingRowForSave(row);
    if (message) {
      setManualRowSaveError((prev) => ({ ...prev, [index]: message }));
      return;
    }
    // [Feature — Owner-requested] Manual-row counterpart to
    // handleSaveCatalogRow's own identical confirmation, above.
    if (parseFloat(row.quantity) === 0 && !window.confirm(`Confirmas que "${row.productName}" tem mesmo 0 em stock?`)) {
      return;
    }
    setManualRowSaveError((prev) => {
      if (!(index in prev)) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
    // [Decision 40 — Validar Workflow, FR-N5/FR-N6] Manual-row
    // counterpart to handleSaveCatalogRow's own identical write, above
    // — same `updateManualRow` path every other field edit already
    // uses, same autosave mechanism, no new trigger.
    updateManualRow(index, { validated: true });
  };

  const handleEditManualRow = (index: number) => {
    if (!window.confirm('Este produto já foi validado. Queres editá-lo?')) return;
    // [Decision 40 — Validar Workflow] Inverse of Validar, above.
    updateManualRow(index, { validated: false });
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
    // [FR-89–FR-94, Implementation Authorization §2 item 4 / Plan §7]
    // A newly-added physical quantity entry for an EXISTING product
    // must default from that product's own remembered selling
    // configuration, exactly like buildCatalogRow's own first row
    // already does — it must never start wholly blank merely because
    // it arrived via "+ Adicionar Porção" rather than as the
    // auto-populated catalog row. Reuses buildCatalogRow itself
    // (unmodified — same two-tier resolution, same
    // sellingPriceAutoFilled: true default) rather than duplicating its
    // resolution logic a second time (Implementation Plan §15,
    // Reuse-First Confirmation). A manual row never carries productId
    // (existing, unmodified convention — matched by name instead,
    // exactly like every other manual row of an existing product), so
    // that field is explicitly cleared even though buildCatalogRow
    // itself would set it. If no matching product is found (should not
    // occur in practice — this handler is only ever invoked for an
    // already-known group/product name), falls back to the existing,
    // unmodified wholly-blank createManualRow() behavior.
    const trimmedName = groupDisplayName.trim().toLowerCase();
    const matchedProduct = products.find((p) => p.name.trim().toLowerCase() === trimmedName);
    let newRow: StockCountWorkingRow = matchedProduct
      ? { ...buildCatalogRow(matchedProduct), productId: undefined, productName: groupDisplayName }
      : { ...createManualRow(), productName: groupDisplayName };
    // [Implementation Authorization §14 item 1 — closes Rule 8
    // Assessment §17.1 Gap B] If this product's group already has an
    // active in-session reference selling configuration (the
    // always-visible control the Owner may have already set for an
    // earlier portion of this SAME product), derive THIS new portion's
    // price from it immediately, at creation time — rather than
    // leaving it at buildCatalogRow's own static-memory-only default
    // until the Owner happens to nudge the reference field again. Uses
    // the identical `deriveModeAPortionValuations` engine
    // `applyModeAToGroup` already calls for every other portion in the
    // group — no new arithmetic.
    const groupKey = productKeyFor(groupDisplayName);
    const referenceConfig = modeAGroups[groupKey];
    const referencePriceNum = referenceConfig ? Number(referenceConfig.referencePrice) : NaN;
    if (referenceConfig?.referenceUnit && Number.isFinite(referencePriceNum) && referencePriceNum >= 0) {
      const relationship = getEffectiveUnitRelationshipForProductName(groupKey);
      const [derived] = deriveModeAPortionValuations(
        [{ id: 'new-portion', unit: newRow.unit, quantity: 0 }],
        referenceConfig.referenceUnit,
        referencePriceNum,
        relationship
      );
      if (derived.derivedSellingPrice !== null) {
        newRow = {
          ...newRow,
          sellingPrice: String(derived.derivedSellingPrice),
          sellingPriceBasisUnit: newRow.unit,
          sellingPriceAutoFilled: true,
        };
      }
    }
    const nextManualRows = [...manualRows, newRow];
    setManualRows(nextManualRows);
    // [Decision 39a] Structural add — '__meta__', matching handleAddManualRow.
    scheduleRowDraftSave('__meta__');
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
    // [Decision 39a] A bulk rename spans potentially several manual
    // rows at once, not one row's own edit — scheduled under '__meta__'.
    scheduleRowDraftSave('__meta__');
  };

  const handleTypeChange = (nextType: StockCountType) => {
    submissionIdRef.current = null;
    setType(nextType);
    // [Decision 39a] Count-level metadata, not a row — '__meta__'.
    scheduleRowDraftSave('__meta__');
  };

  const handleLabelChange = (nextLabel: string) => {
    submissionIdRef.current = null;
    setLabel(nextLabel);
    scheduleRowDraftSave('__meta__');
  };

  const handleDateChange = (nextDate: string) => {
    submissionIdRef.current = null;
    setDate(nextDate);
    scheduleRowDraftSave('__meta__');
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
    // [FR-89–FR-94, Implementation Authorization §2 item 4 / Plan §6.2]
    // Re-seed the in-session edit-sequence counter to one past the
    // highest sellingPriceEditSequence found among every resumed row
    // (catalog and manual alike) — never resets to 0, which would let a
    // further deliberate edit in this resumed session collide with an
    // already-stamped value from before the interruption. A draft with
    // no such rows (written before this capability existed, or with no
    // deliberate edits yet) simply re-seeds to 0, identical to a fresh
    // session's own starting state.
    const allResumedRows = [...Object.values(nextCatalogRows), ...nextManualRows];
    const highestResumedSequence = allResumedRows.reduce(
      (max, row) => (row.sellingPriceEditSequence !== undefined && row.sellingPriceEditSequence > max ? row.sellingPriceEditSequence : max),
      0
    );
    sellingPriceEditSequenceRef.current = highestResumedSequence;
    setType(periodicStockDraft.type);
    setLabel(periodicStockDraft.label || '');
    setDate(periodicStockDraft.date);
    submissionIdRef.current = periodicStockDraft.submissionId || null;
    // [Decision 38 Amendment, Implementation Task §5b; Implementation
    // Authorization §2 item 5] A draft written before this field
    // existed simply lacks it — `?? {}` treats that absence as an
    // empty object, the same discipline already applied elsewhere in
    // this codebase for every other optional draft field, never as an
    // error and never requiring migration/backfill.
    //
    // [Decision 37 B.2 Selling Unit Capture Extension] `sellingUnit`
    // is declared optional on this same state shape (above) precisely
    // so this exact, pre-existing restore call needs no change: a
    // draft written before `sellingUnit` existed simply lacks that
    // property on each entry, which an optional field already treats
    // as "unset", not as an error — the same "absence is not an
    // error" discipline as the `?? {}` above, requiring no per-entry
    // mapping.
    setNewProductInfo(periodicStockDraft.newProductInfo ?? {});
    setDraftSaveState('saved');
    setDraftBannerDismissed(true);
  };

  // Começar de novo — explicit "start over" path (Implementation Task,
  // Section 5), distinct from finalization's own automatic cleanup
  // inside recordStockCount.
  //
  // [Discard-Confirmation Safety Fix — Rule 8 Finding 2, Implementation
  // Authorization §1 item 2] Reordered: `clearPeriodicStockDraft()` is
  // now fully awaited BEFORE `setDraftBannerDismissed(true)` runs, not
  // after. Previously, the blank form (and every input capable of
  // scheduling a fresh autosave via scheduleDraftSave) became reachable
  // the instant this function was called, while the delete was still in
  // flight — an untracked fourth async write path racing
  // draftInFlightSaveRef-protected autosave writes for the same
  // document, with no serialization between them. Awaiting the delete
  // first closes this by construction: the blank form cannot render,
  // and therefore no new autosave can be scheduled, until the singleton
  // document is confirmed gone (or the attempt has failed and settled —
  // either way, no live operation remains to race). This function is
  // now only ever invoked from the confirmation step's own "Começar
  // Nova Contagem" action (see discardConfirmState, above) — never
  // directly from the first-level "Começar de Novo" click.
  const handleDiscardDraft = async () => {
    submissionIdRef.current = null;
    setDiscardConfirmState('discarding');
    try {
      await clearPeriodicStockDraft();
    } catch {
      // Best-effort — if this fails, the stale draft is simply
      // overwritten by the next autosave, or the banner reappears next
      // mount; not a blocking error for the operator's current session.
    } finally {
      setDraftBannerDismissed(true);
    }
  };

  // [Decision 40 — Validar Workflow, FR-N8; Implementation
  // Authorization §1 item 4] A validated row is excluded from the
  // active workspace by the SAME kind of filter `!row.removed` already
  // applies, one term added alongside it (`!row.validated`),
  // falsy-safe so a legacy/absent value is treated as "not validated"
  // — never removed from `catalogRows` itself. `removed` and
  // `validated` are orthogonal; a row that is somehow both is treated
  // as removed for THIS view's purposes (it is not offered back as an
  // active row to work on), and is surfaced via the existing "Removidos"
  // list rather than the new accumulated list below.
  const visibleCatalogEntries = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    return Object.entries(catalogRows)
      .filter(([, row]) => !row.removed && !row.validated)
      .filter(([, row]) => !search || row.productName.toLowerCase().includes(search))
      .sort((a, b) => a[1].productName.localeCompare(b[1].productName));
  }, [catalogRows, productSearch]);

  const removedCatalogEntries = useMemo(
    () => Object.entries(catalogRows).filter(([, row]) => row.removed),
    [catalogRows]
  );

  // [Decision 40 — Validar Workflow, FR-N8; Implementation
  // Authorization §1 item 5] The accumulated/validated area — every
  // catalog row the Owner has pressed "Validar" on, still fully
  // present in `catalogRows`, simply rendered here instead of in the
  // active grid above. Excludes a row also marked `removed` (see
  // `visibleCatalogEntries`'s own comment, immediately above) so a row
  // is never listed in both places at once.
  const validatedCatalogEntries = useMemo(
    () => Object.entries(catalogRows).filter(([, row]) => row.validated && !row.removed),
    [catalogRows]
  );

  // The full working list — every catalog row (visible, removed,
  // validated, or still-blank alike) plus every manual row — is what
  // actually gets tallied. Search/validated-status only ever affect
  // what's displayed, never what's counted, so a removed/validated/
  // filtered-out product is never silently dropped from Not Counted
  // or from finalization. [Decision 40 — Validar Workflow;
  // Implementation Authorization §1 item 4 / Rule 8 §C] Deliberately
  // NOT filtered by `validated` — this is the load-bearing guarantee
  // that a validated row remains fully available to autosave, resume,
  // review, and finalization even though it has left the active-
  // workspace view above.
  const allWorkingRows: StockCountWorkingRow[] = useMemo(
    () => [...Object.values(catalogRows), ...manualRows],
    [catalogRows, manualRows]
  );

  // [Business Worth Evolution — Increment 10 Item 5 / §25, FR-67]
  // Resolved from the full catalog (`products`) exactly like
  // AppContext.tsx's own identical call.
  const costBasisByProductName = useMemo(() => buildProductCostBasisMap(products), [products]);

  // [§45 Amendment FR-78/FR-80; Implementation Authorization §2 item 1]
  // The newProductInfo-derived cost-basis synthesis formerly here is
  // removed along with the "Custo de Compra Original" input it read
  // from (purchaseUnit+purchaseCost) — there is no owner-entered
  // purchase cost left, for any product, to synthesize a basis from.
  // costBasisByProductName (the saved-catalog basis, computed above,
  // entirely unaffected) is used directly wherever this alias was
  // previously read — a genuinely new product simply has no cost
  // basis, which deriveCostContribution/FR-67 already handles safely
  // (a non-fabricated 0/derived:false, never a synthetic figure).
  const effectiveCostBasisByProductName = costBasisByProductName;

  // [§44 — Periodic Contagem Cost-Price Removal — Implementation
  // Clarification] rowCostValue existed solely to power the per-row
  // "Custo: X" caption removed from both the catalog-row and manual-row
  // Valor blocks, above. With no remaining caller, it is removed here
  // too rather than left as dead code. deriveCostContribution itself
  // (imported below) is unaffected and remains fully in use by
  // liveTally/tallyStockCountRows for the real, governed totals.

  const liveTally = useMemo(
    () => tallyStockCountRows(allWorkingRows, effectiveCostBasisByProductName),
    [allWorkingRows, effectiveCostBasisByProductName]
  );

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

  // [Fix — product search only filtered the catalog grid, doing nothing
  // for a manually-added product] productSearch/visibleCatalogEntries
  // (above) only ever covered "Produtos do Catálogo" — for an Owner
  // whose product was added via "Adicionar produto que não está no
  // catálogo" (or whose business has few/no catalog products at all,
  // everything manual), typing into that search box visibly did
  // nothing, since nothing here read productSearch against manualRows.
  // This applies the SAME search text to manualRowGroups' own
  // displayName — one search box, one query, both places a product
  // could actually be, so finding a specific product among a long list
  // (mid-Contagem, after spotting an error) no longer depends on which
  // of the two sections it happens to live in.
  const visibleManualRowGroups = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    if (!search) return manualRowGroups;
    return manualRowGroups.filter((group) => group.displayName.toLowerCase().includes(search));
  }, [manualRowGroups, productSearch]);

  // [Decision 40 — Validar Workflow, FR-N8/FR-N9; Implementation
  // Authorization §1 items 4/5] Flat list of validated manual-row
  // portions, for the accumulated/validated area below — each entry
  // still carries its own stable `idx` into `manualRows` (never
  // spliced or reordered because of validated status, per FR-N9), so
  // reopening one is a direct `updateManualRow(idx, { validated: false })`
  // call, identical to the mechanism used everywhere else in this
  // file. `manualRowGroups`/`visibleManualRowGroups` themselves are
  // deliberately NOT filtered by validated status (mirroring
  // `allWorkingRows`'s own "never filtered by validated" principle,
  // above) — a group's header/summary content is unaffected by which
  // of its own portions happen to be validated; only the individual
  // portion rows rendered inside a group's card are filtered, at the
  // render site itself, below.
  const validatedManualRowEntries = useMemo(
    () =>
      manualRows
        .map((row, idx) => ({ idx, row }))
        .filter(({ row }) => row.validated && !row.removed),
    [manualRows]
  );

  // [§44 — Periodic Contagem Cost-Price Removal, FR-74] `diff`/`diffPct`
  // (the live cost-basis trend indicator's own computation) are removed
  // along with the JSX that consumed them and `comparisonBaseline`,
  // above — nothing else read them.

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

    // [Decision 40 — Validar Workflow, FR-N11; Implementation
    // Authorization §1 item 7] A LOCAL array, built only for this
    // tally call — `allWorkingRows` itself (used immediately below for
    // the identity write, and everywhere else in this file) is
    // deliberately NOT modified. Catalog rows already carry their own
    // stable `productId` (`buildCatalogRow`); manual rows are tagged
    // here with their current array index so `StockCountTallyItem`
    // (below) can carry enough identity for the review screen's
    // "Corrigir" action to resolve which row to reopen. This ephemeral
    // tagging is never persisted — `manualRowIndex` is excluded by
    // construction from workingRowToDraftItem's explicit literal (see
    // that function's own comment, utils/stockCount.ts).
    const rowsForTally: StockCountWorkingRow[] = [
      ...Object.values(catalogRows),
      ...manualRows.map((row, idx) => ({ ...row, manualRowIndex: idx })),
    ];
    const tally = tallyStockCountRows(rowsForTally, effectiveCostBasisByProductName);
    if (tally.countedItems.length === 0) {
      setError('Introduza a quantidade física de pelo menos um produto antes de confirmar.');
      return;
    }
    for (const item of tally.countedItems) {
      // Negative cost/selling price was already guarded here. Negative
      // quantity was NOT — the Qtd <input> has no min="0" (unlike the
      // price fields), and nothing downstream (tallyStockCountRows,
      // normalizeStockCountItems, firestore.rules) rejects it either,
      // so a stray "-5" silently corrupted every total it fed into
      // with no error shown. A quantity of exactly 0 remains valid and
      // intentional here — BDR-0009 Part 4's own "Counted vs Not
      // Counted" rule treats '0' as a legitimate physical count,
      // distinct from a blank/Not-Counted row — so this only rejects
      // strictly negative values, never zero.
      if (item.quantity < 0) {
        setError(`Introduza uma quantidade válida (0 ou mais) para "${item.productName}".`);
        return;
      }
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
    // [Decision 39a] Every pending per-row timer, not a single ref.
    rowDebounceTimersRef.current.forEach((timer) => clearTimeout(timer));
    rowDebounceTimersRef.current.clear();

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
    //
    // [Decision 38 Amendment, Implementation Task §5b; Implementation
    // Authorization §2 item 5] newProductInfo is included here too —
    // this is a full-document overwrite exactly like scheduleDraftSave's
    // own writes, so omitting it here would silently erase any
    // already-persisted newProductInfo the moment the operator reaches
    // pendingTally, even though nothing about it changed.
    setDraftSaveState('saving');
    const allRows = allWorkingRows.map(workingRowToDraftItem);
    identityWriteRef.current = savePeriodicStockDraft(
      allRows,
      type,
      label.trim() || undefined,
      date,
      submissionIdRef.current,
      newProductInfo
    )
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
      // [Decision 39a] Every pending per-row timer, not a single ref.
      rowDebounceTimersRef.current.forEach((timer) => clearTimeout(timer));
      rowDebounceTimersRef.current.clear();
      if (draftInFlightSaveRef.current) {
        await draftInFlightSaveRef.current;
      }
      if (identityWriteRef.current) {
        await identityWriteRef.current;
      }
      // §4c [Decision 38 Amendment; Implementation Authorization §2
      // item 7 — the single most safety-critical requirement in this
      // amendment]: await the interruption-durability flush the same
      // way §4b's identity write is awaited above, not merely
      // cancelled the way §4a's ordinary debounce is above. By the
      // time recordStockCount is called below, every draft-write
      // promise this component could have in flight — ordinary
      // autosave, submission identity, and now the flush — has either
      // been cancelled-because-harmless (§4a) or awaited to completion
      // (§4b, this step). No code path issues a new write to
      // stockCountDrafts/periodic after this point: structurally
      // impossible, not merely conventionally avoided, exactly as
      // §4a/§4b already establish for their own two write paths.
      if (flushInFlightSaveRef.current) {
        await flushInFlightSaveRef.current;
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
      // can ever be incomplete.
      //
      // [Decision 37 B.2 Selling Unit Capture Extension — signed
      // addendum + Implementation Authorization] `sellingUnit` is now
      // included below, from the SAME newProductInfo.sellingUnit the
      // owner chose in NewProductInfoPanel's own selector, once it's
      // confirmed to still be a live member of this candidate's own
      // chain (see the guard immediately below) — never fabricated,
      // never inferred, never forced to equal the purchase unit.
      // Product.unitRelationship.sellingUnit remains the existing,
      // optional field per isValidUnitRelationship's own unmodified
      // contract; Mode A/B's own separately-authorized reference-unit
      // mechanism is unaffected by this and remains free to let the
      // Owner pick any chain unit for a temporary Mode A preview,
      // independent of this persisted selling unit.
      const unitRelationshipByProductName = new Map<string, UnitRelationship>();
      for (const [key, info] of Object.entries(newProductInfo)) {
        if (!key) continue;
        const completeSteps = info.relationshipSteps.filter(
          (s) => s.unit.trim() && Number.isFinite(parseFloat(s.factor)) && parseFloat(s.factor) > 0
        );
        if (completeSteps.length === 0) continue;
        const fallbackRow = allWorkingRows.find((r) => productKeyFor(r.productName) === key);
        const purchaseUnit = info.purchaseUnit.trim() || fallbackRow?.unit || 'un';
        // [Decision 37 B.2 Selling Unit Capture Extension —
        // Implementation Authorization §2 item 3] Same live-membership
        // guard as getEffectiveUnitRelationshipForProductName's own
        // identical comment, above — the two candidate-construction
        // sites must never disagree on what counts as a valid selling
        // unit for the same product.
        const candidateUnits = [purchaseUnit, ...completeSteps.map((s) => s.unit.trim())];
        const effectiveSellingUnit = info.sellingUnit && candidateUnits.includes(info.sellingUnit) ? info.sellingUnit : undefined;
        const candidate: UnitRelationship = {
          units: [
            { unit: purchaseUnit, factorFromPrevious: 0 },
            ...completeSteps.map((s) => ({ unit: s.unit.trim(), factorFromPrevious: parseFloat(s.factor) })),
          ],
          ...(effectiveSellingUnit ? { sellingUnit: effectiveSellingUnit } : {}),
          confirmedAt: new Date().toISOString(),
        };
        if (isValidUnitRelationship(candidate)) {
          unitRelationshipByProductName.set(key, candidate);
        }
      }

      // [FR-89–FR-94, Implementation Authorization §2 item 5 / Plan
      // §6.3, §10] Snapshot of every working row's own deliberate-vs-
      // default selling-configuration state at the moment of
      // confirmation, built from allWorkingRows (catalog + manual rows
      // alike, above) — never from pendingTally.countedItems, which
      // carries no sellingPriceAutoFilled/sellingPriceEditSequence
      // information at all (StockCountTallyItem's own explicit-literal
      // shape never includes them). Blank/unparseable sellingPrice rows
      // are included here too — AppContext.tsx's own construction
      // already guards on `Number.isFinite`, so an unresolved row is
      // simply never a candidate, exactly like today. This is the
      // un-persisted parameter recordStockCount's own
      // sellingMemoryByProductName construction now consumes (§6.3) —
      // never written to any Firestore document itself.
      const workingRowDeliberateEntries = allWorkingRows.map((row) => ({
        productName: row.productName,
        sellingPrice: Number(row.sellingPrice),
        // [Bug fix — Finding A, fresh audit] Must be the unit the
        // deliberate sellingPrice is ACTUALLY denominated in, not the
        // row's own (possibly since-changed) physical count unit — Rule
        // 2 (applySellingConfigurationEditRules, above) deliberately
        // preserves a deliberate row's own sellingPriceBasisUnit
        // unchanged when only the physical unit is later edited, so the
        // two can legitimately diverge. Reading row.unit here would
        // silently reinterpret, e.g., a deliberate 480 MZN/Cx as 480
        // MZN/Un the moment the Owner relabels that row's physical
        // count to Un without touching the price — exactly what
        // FR-91/FR-23 forbid. sellingPriceBasisUnit is only ever unset
        // for a still-default row (never a deliberate one — Rule 1
        // always sets it in the same write that sets
        // sellingPriceAutoFilled: false), so falling back to row.unit
        // is safe and correct for every non-deliberate row.
        unit: row.sellingPriceBasisUnit ?? row.unit,
        sellingPriceAutoFilled: row.sellingPriceAutoFilled,
        sellingPriceEditSequence: row.sellingPriceEditSequence,
      }));

      // [Implementation Authorization §14 item 7 — Reference Selling
      // Configuration as the Default Path] Every product group's own
      // active in-session reference-price declaration (the
      // always-visible control that replaces the former Mode A
      // toggle) — a second, parallel kind of deliberate act, competing
      // in the exact same "last deliberately entered wins" tie-break
      // as workingRowDeliberateEntries above
      // (selectSellingMemorySelection.ts's own header comment). Only a
      // group with a non-blank, parseable referencePrice AND a
      // recorded editSequence (i.e. the Owner has actually typed into
      // the reference-price field this session, not merely seen its
      // computed default) is included — a group left at its
      // pre-filled, never-touched default contributes no candidate
      // here, exactly like an untouched row contributes none to
      // workingRowDeliberateEntries above.
      const referencePriceEntries = Object.entries(modeAGroups)
        .filter(([, config]) => config.editSequence !== undefined && config.referenceUnit && config.referencePrice.trim() !== '')
        .map(([productKey, config]) => {
          const matchingRow = allWorkingRows.find((row) => productKeyFor(row.productName) === productKey);
          return {
            productName: matchingRow?.productName ?? productKey,
            sellingPrice: Number(config.referencePrice),
            unit: config.referenceUnit,
            editSequence: config.editSequence!,
          };
        })
        .filter((entry) => Number.isFinite(entry.sellingPrice) && entry.sellingPrice >= 0);

      const saved = await recordStockCount({
        type,
        label: type === 'custom' ? label.trim() : undefined,
        date,
        workingRowDeliberateEntries,
        referencePriceEntries,
        items: pendingTally.countedItems.map((item) => ({
          // [Decision 40 — Validar Workflow; Implementation
          // Authorization §1 item 8/§9] This is an explicit, named
          // literal, not a spread of `item` — `StockCountTallyItem`'s
          // own `productId`/`manualRowIndex`/`validated`/
          // `sellingPriceAutoFilled` fields (added for the review
          // screen's "Corrigir" affordance, or for this confirm
          // handler's own valuationMode tagging immediately below) are
          // therefore excluded here by construction, exactly like
          // every other UI-only field this codebase already keeps out
          // of a finalized StockCount this same way.
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          // [FR-89–FR-94, Implementation Authorization §10, Option C]
          // Pass-through — item.sellingPriceBasisUnit is already
          // resolved to a defined string by tallyStockCountRows
          // (stockCount.ts) — see StockCountItem.sellingPriceBasisUnit's
          // own comment (types.ts) for the full rationale.
          sellingPriceBasisUnit: item.sellingPriceBasisUnit,
          // [Product Memory / UOM — Increment A, Checkpoint 2c]
          ...(unitRelationshipByProductName.has(item.productName.trim().toLowerCase())
            ? { unitRelationship: unitRelationshipByProductName.get(item.productName.trim().toLowerCase())! }
            : {}),
          // [Implementation Authorization §14 item 6 — Reference
          // Selling Configuration as the Default Path] Moved from a
          // per-product-group flag (`modeAGroups` presence — which,
          // now that the reference control is always visible for every
          // multi-unit product, would tag EVERY such product 'A'
          // regardless of whether the Owner actually used the shared
          // reference or priced every portion independently) to a
          // per-item flag sourced from THIS item's own
          // `sellingPriceAutoFilled` — `true` means this specific
          // portion is still following the shared/default selling
          // configuration; `false` (or a directly-overridden portion)
          // is independently priced and is correctly NOT tagged.
          // Display-only (types.ts, StockCountItem.valuationMode's own
          // comment) — never read by any calculation; the item's own
          // sellingPrice above (reference-derived or independently
          // typed, indistinguishably) is what determines valuation,
          // exactly as it already did before this correction. Omitted
          // entirely for an independently-priced portion, matching
          // this codebase's existing "absence is the default"
          // convention.
          ...(item.sellingPriceAutoFilled === true ? { valuationMode: 'A' as const } : {}),
        })),
        expectedValueAtCount: expectedCurrentStockValue,
        submissionId: submissionIdRef.current || undefined,
        // [Fix — Business Worth Evolution was never actually switched on]
        // Specification §14, Decision 1: "producesBusinessWorthSnapshot
        // is set true on every Contagem confirmed under this model going
        // forward" — an every-confirmation default, not a
        // correction-only special case. Until this fix, the ONLY place
        // in this entire codebase that ever set this flag true was the
        // correction/recovery branch just below — meaning an ordinary
        // Confirmar Contagem never actually produced a
        // BusinessWorthSnapshot at all, and the Dashboard's "Valor do
        // Negócio" card was permanently stuck showing the Estimated
        // (Capital-Inicial-anchored) fallback, never Current, for every
        // business, regardless of how many Contagens were confirmed.
        // Periodic Contagem has no competing OLDER recovery mechanism of
        // its own (unlike 'initial' — see InitialStockCountView, which
        // this fix deliberately does NOT touch: that screen's existing
        // Void & Redo mechanism, and its own already-confirmed
        // historical records, are completely unaffected either way —
        // FR-19 explicitly forbids ever retroactively marking a
        // historical StockCount, so nothing already confirmed changes).
        // So turning this on for periodic confirmations has no
        // Void-&-Redo-exclusivity implication to resolve here.
        producesBusinessWorthSnapshot: true,
        // [Fix — same gap, the cash half of it] Specification §10
        // Decision 3, FR-55: cashPosition is "required product behavior
        // whenever producesBusinessWorthSnapshot is true." Sourced from
        // the Owner's own most recent Cash Position declaration
        // (Dívidas screen, cashPositionDeclarations[0] — already
        // newest-first, AppContext's own onSnapshot sort) — never a
        // fabricated 0, and genuinely omitted (not merely defaulted)
        // when the Owner has never declared one yet, exactly matching
        // this field's own "genuinely omitted... when the caller
        // supplies nothing" contract (RecordStockCountParams, above).
        ...(cashPositionDeclarations.length > 0
          ? { ownerConfirmedCashPosition: cashPositionDeclarations[0].amount }
          : {}),
        // [Business Worth Evolution — Implementation Authorization,
        // Increment 8; Specification §25, §26, FR-38, FR-39, FR-58]
        // When this confirmation is a correction/recovery
        // (pendingBusinessWorthCorrection, set only via DashboardView's
        // own eligibility-gated entry point), the correction-specific
        // target snapshot id/kind are added on top of the (now always
        // already-true) producesBusinessWorthSnapshot above — never
        // free-typed here, only ever the value startBusinessWorthCorrection
        // already recorded. firestore.rules independently and
        // authoritatively re-verifies eligibility regardless of what is
        // asserted here.
        ...(pendingBusinessWorthCorrection
          ? {
              correctionOfSnapshotId: pendingBusinessWorthCorrection.snapshotId,
              correctionKind: pendingBusinessWorthCorrection.kind,
            }
          : {}),
      });
      setSavedTotal(saved.totalValue);
      // [Feature — optional local download] saved.totalSellingValue is
      // optional on the StockCount type only for historical counts
      // recorded before this field existed — every count confirmed
      // through this code path always sets it (normalizeStockCountItems
      // always returns totalSellingValue), so `?? 0` is a type-safety
      // fallback only, never an expected runtime path here.
      setSavedSellingTotal(saved.totalSellingValue ?? 0);
      setSavedTally(pendingTally);
      setSavedReconciliation(saved.businessWorthReconciliation);
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
      // [Feature — reconciliation signal reaching the Owner] An ordinary
      // confirmation with nothing to report still auto-advances after
      // 2200ms exactly as before. When there IS something meaningful to
      // show, the auto-advance is skipped entirely — 2.2 seconds isn't
      // enough time to read a reconciliation note, and sweeping the
      // Owner to the Dashboard before they've seen it would defeat the
      // entire point of surfacing it. "Continuar →" (below) still lets
      // them move on immediately whenever they're ready.
      if (!saved.businessWorthReconciliation) {
        autoAdvanceTimerRef.current = setTimeout(() => onComplete(), 2200);
      }
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

  // [Feature — optional local download of a confirmed Contagem, Owner-
  // requested] Builds and triggers a downloadable receipt for the just-
  // confirmed count — a genuinely optional action; nothing here runs
  // unless the Owner explicitly taps one of the two buttons on the
  // success screen below. Cancels the pending auto-navigate timer (see
  // autoAdvanceTimerRef's own comment) so the Owner isn't swept away to
  // the Dashboard mid-download. Reuses savedTally/savedTotal/
  // savedSellingTotal exactly as already captured from
  // recordStockCount's own return value — never a second, independently
  // recomputed total, so the receipt can never disagree with what was
  // actually persisted.
  const buildReceiptContent = () => {
    if (!savedTally) return null;
    const reportTitle = `Comprovativo de Contagem — ${TYPE_LABELS[type]}`;
    const periodLabel = `${formatDate(date)}${label.trim() ? ` — ${label.trim()}` : ''}`;
    const kpis = [
      { label: 'Valor de Venda', value: formatCurrency(savedSellingTotal, currencySymbol) },
      { label: 'Valor Físico (Custo)', value: formatCurrency(savedTotal, currencySymbol) },
      { label: 'Produtos Contados', value: String(savedTally.countedItems.length) },
      ...(savedTally.notCountedProductNames.length > 0
        ? [{ label: 'Produtos Não Contados', value: String(savedTally.notCountedProductNames.length) }]
        : []),
    ];
    const tables = [
      {
        title: 'Produtos Contados',
        // [§44 — Periodic Contagem Cost-Price Removal — Implementation
        // Clarification] The "Custo/Un" column (item.costPrice, the raw
        // per-unit value) is removed — the Owner no longer supplies or
        // observes this figure during Periodic Contagem, so presenting
        // it in the receipt would misrepresent it as an Owner-provided
        // fact. "Valor (Custo)" (item.purchaseValue) is preserved: it
        // remains a real, governed, derived total (FR-72, unaffected)
        // whenever a valid cost basis exists — it does not become
        // meaningless merely because the input was removed, so it is
        // not removed alongside it.
        columns: ['Produto', 'Qtd', 'Unid', 'Venda/Un', 'Valor (Custo)', 'Valor (Venda)'],
        rows: savedTally.countedItems.map((item) => [
          item.productName,
          item.quantity,
          item.unit,
          formatCurrency(item.sellingPrice, currencySymbol),
          formatCurrency(item.purchaseValue, currencySymbol),
          formatCurrency(item.sellingValue, currencySymbol),
        ]),
      },
      ...(savedTally.notCountedProductNames.length > 0
        ? [
            {
              title: 'Produtos Não Contados',
              columns: ['Produto'],
              rows: savedTally.notCountedProductNames.map((name) => [name]),
            },
          ]
        : []),
    ];
    return { reportTitle, periodLabel, kpis, tables };
  };

  const handleDownloadReceiptPdf = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    const content = buildReceiptContent();
    if (!content) return;
    exportReportPdf(content.reportTitle, business?.name || 'Meu Negócio', content.periodLabel, content.kpis, content.tables);
  };

  const handleDownloadReceiptExcel = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    const content = buildReceiptContent();
    if (!content) return;
    exportReportExcel(content.reportTitle, content.kpis, content.tables, {
      indicator: 'Indicador',
      value: 'Valor',
      summary: 'Resumo',
      tableFallback: 'Tabela {{n}}',
    });
  };

  if (savedMessage) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex flex-col items-center text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" strokeWidth={2.25} />
        </div>
        <h2 className="type-title">{savedMessage}</h2>
        {/* [§44 — Periodic Contagem Cost-Price Removal, FR-75;
            Implementation Authorization §2 item 5] The headline
            valuation is now the counted Selling Value, aligning this
            screen with the live entry screen's own primary figure and
            with Business Worth's selling-price basis. The prior
            unconditional cost-basis headline ("Valor Físico Total (a
            custo)") is removed — no secondary cost figure is
            introduced on this screen either, consistent with removing
            Cost Price as an Owner-facing concept throughout Periodic
            Contagem (per the Implementation Clarification applied to
            the per-row caption and the receipt). savedTotal itself is
            untouched and remains available to the optional downloadable
            receipt (buildReceiptContent, above), which is unaffected by
            this screen's own headline. */}
        <p className="text-sm text-gray-500">
          Valor de Venda Total:{' '}
          <span className="font-display font-semibold text-[#0B1F3A] tabular-nums">
            {formatCurrency(savedSellingTotal, currencySymbol)}
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
        {/* [Feature — reconciliation signal reaching the Owner, Owner-
            requested] Rendered only when recordStockCount's own return
            value actually carried something to report (see
            savedReconciliation's own declaration comment, above) — an
            ordinary confirmation with nothing unusual renders nothing
            here at all, not an empty card. Deliberately calm, neutral
            framing throughout ("possíveis causas a investigar," never
            "erro"/"problema") — matching FR-56's own "never asserted as
            fact" discipline; this is evidence to consider, not an
            accusation or a determined explanation. getPossibleReconciliationCauses
            (calculations.ts) is a pure function reading only
            savedReconciliation's own already-captured figures plus the
            live payables/receivables arrays — never a second,
            independently-invented evidence check. */}
        {savedReconciliation && (() => {
          const possibleCauses = getPossibleReconciliationCauses({
            expensesSinceLastSnapshot: savedReconciliation.expensesSinceLastSnapshot,
            breakagesSinceLastSnapshot: savedReconciliation.breakagesSinceLastSnapshot,
            levantamentosSinceLastSnapshot: savedReconciliation.levantamentosSinceLastSnapshot,
            outstandingPayables: payables,
            outstandingReceivables: receivables,
          });
          const hasWorthDifference =
            typeof savedReconciliation.difference === 'number' && Math.abs(savedReconciliation.difference) >= 0.01;
          const hasCashDifference =
            typeof savedReconciliation.cashReconciliationDifference === 'number' &&
            Math.abs(savedReconciliation.cashReconciliationDifference) >= 0.01;
          if (!hasWorthDifference && !hasCashDifference) return null;
          return (
            <div className="w-full max-w-md bg-amber-50/60 border border-amber-200 rounded-2xl px-4 py-3.5 text-left space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
                Nota de Reconciliação
              </p>
              {hasWorthDifference && (
                <p className="text-[13px] text-gray-700">
                  O Valor do Negócio medido ficou{' '}
                  <span className="font-semibold">
                    {formatCurrency(Math.abs(savedReconciliation.difference!), currencySymbol)}
                  </span>{' '}
                  {savedReconciliation.difference! < 0 ? 'abaixo' : 'acima'} do valor estimado antes desta contagem.
                </p>
              )}
              {hasCashDifference && (
                <p className="text-[13px] text-gray-700">
                  A posição de caixa declarada difere em{' '}
                  <span className="font-semibold">
                    {formatCurrency(Math.abs(savedReconciliation.cashReconciliationDifference!), currencySymbol)}
                  </span>{' '}
                  do que o registo de caixa (Dívidas) indica.
                </p>
              )}
              {possibleCauses.length > 0 && (
                <div className="pt-1 space-y-1">
                  <p className="text-[11px] font-semibold text-amber-700">
                    Possíveis causas a investigar:
                  </p>
                  <ul className="text-[12.5px] text-gray-600 space-y-1 list-disc list-inside">
                    {possibleCauses.map((cause) => (
                      <li key={cause.key}>{renderReconciliationCauseLabel(cause, currencySymbol)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })()}
        {/* [Feature — optional local download, Owner-requested] Purely
            optional — tapping neither button changes nothing about the
            existing 2200ms auto-navigate-to-Dashboard behavior. Tapping
            either one cancels that timer (see handleDownloadReceiptPdf/
            Excel's own comment) and generates a downloadable receipt of
            this exact confirmed count, entirely on-device — no server
            round-trip, no data leaves the browser beyond the normal
            Firestore write that already just happened. "Continuar"
            lets the Owner move on immediately whenever they're ready,
            whether or not they downloaded anything. */}
        {savedTally && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadReceiptPdf}
                className="btn-secondary py-2 px-3.5 text-xs"
              >
                Descarregar Comprovativo (PDF)
              </button>
              <button
                type="button"
                onClick={handleDownloadReceiptExcel}
                className="btn-secondary py-2 px-3.5 text-xs"
              >
                Descarregar Comprovativo (Excel)
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (autoAdvanceTimerRef.current) {
                  clearTimeout(autoAdvanceTimerRef.current);
                  autoAdvanceTimerRef.current = null;
                }
                onComplete();
              }}
              className="text-[13px] font-semibold text-gray-500 hover:text-[#0B1F3A] transition-colors duration-150 pt-1"
            >
              Continuar →
            </button>
          </div>
        )}
      </div>
    );
  }

  // Mandatory Counted/Not Counted confirmation (Amendment Part 9) —
  // shown after "Confirmar Contagem" and before anything is actually
  // persisted.
  // [Decision 40 — Validar Workflow, FR-N11; Implementation
  // Authorization §1 item 7, §3 items 7-9] "Corrigir" — reopens one
  // validated product directly from the review screen. Resolves
  // identity from the extended `StockCountTallyItem` (catalog rows by
  // `productId`, manual rows by `manualRowIndex` — see
  // `handleRequestConfirmation`'s own `rowsForTally` tagging, above),
  // clears that ONE row's `validated` flag via the exact same
  // `updateCatalogRow`/`updateManualRow` write path every other
  // validate/edit transition in this file already uses, then discards
  // `pendingTally` — exactly what "Voltar" already does — so the Owner
  // is never shown a stale review snapshot alongside freshly-editable
  // live state. Manual-row identity (array index) is safe here
  // because this entire function is only reachable while `pendingTally`
  // is non-null, and no code path in this file mutates `manualRows`'
  // order or length while the review screen's own render branch
  // (immediately below) is showing in place of the active workspace.
  const handleCorrigirTallyItem = (item: StockCountTallyItem) => {
    if (item.productId) {
      updateCatalogRow(item.productId, { validated: false });
    } else if (item.manualRowIndex !== undefined) {
      updateManualRow(item.manualRowIndex, { validated: false });
    }
    setPendingTally(null);
  };

  if (pendingTally) {
    return (
      <div className="max-w-2xl mx-auto py-10 space-y-5">
        {pendingBusinessWorthCorrection && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
            <p className="text-[13px] font-bold text-amber-800">
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
              <p className="text-[13px] text-gray-500 mt-0.5">Reveja antes de guardar — esta contagem é uma fotografia do que existe fisicamente agora.</p>
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
              <p className="text-[13px] leading-relaxed text-amber-800">
                Esta será uma contagem <strong>parcial</strong>. Os produtos não contados não entram no total nem
                recebem quantidade zero — não presuma que ficaram sem stock.
              </p>
            </div>
          )}

          <div className="rounded-xl bg-[var(--muted)] border border-[#E5E7EB] divide-y divide-[#E5E7EB] max-h-64 overflow-y-auto">
            {/* [Bug fix — duplicate React keys on multi-portion
                products] Was keyed by item.productName alone, which
                collides whenever a single product is counted as more
                than one portion (e.g. CX + EMB + UN of the same
                product) — exactly the multi-unit workflow this screen
                exists to review. React requires sibling keys to be
                unique; a shared key across same-named portions risks
                the wrong row's DOM node being reused/left stale on
                re-render (e.g. "Voltar", edit, then confirm again),
                on the one screen whose purpose is a reliable last
                check before the count becomes permanent. Keyed by
                productName + unit + index — unique per portion, and
                stable for this array (index is safe here since this
                list is always freshly rebuilt from scratch by
                tallyStockCountRows, never reordered/spliced in place).
                [Decision 40 — Validar Workflow] StockCountTallyItem now
                also carries `productId`/`manualRowIndex` (see
                `handleRequestConfirmation`'s own tagging, above) —
                used below only to power "Corrigir," never as a
                rendering key. */}
            {pendingTally.countedItems.map((item, index) => (
              <div key={`${item.productName}-${item.unit}-${index}`} className="flex items-center justify-between gap-2 px-4 py-2 text-[13px]">
                <span className="text-[#111827] font-medium truncate flex items-center gap-1.5">
                  {/* [Decision 40 — Validar Workflow, FR-N11] A small,
                      informational marker distinguishing a product the
                      Owner had explicitly validated from one merely
                      counted while still active — this list already
                      represents the COMPLETE accumulated Contagem
                      either way (§3 of this task: validated products
                      never disappear from the tally). */}
                  {item.validated && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" strokeWidth={2.5} aria-label="Validado" />
                  )}
                  <span className="truncate">{item.productName}</span>
                </span>
                <span className="text-right shrink-0 flex items-center gap-2">
                  <span>
                    <span className="block text-gray-500 tabular-nums">
                      {item.quantity} {item.unit}
                    </span>
                    {/* [Manual data-entry error investigation, Finding 2]
                        This is the last screen before a Contagem becomes
                        permanent and directly feeds Business Worth — and
                        until this fix it showed quantity but never price,
                        the field a fat-finger typo (an extra/missing
                        zero) is most likely to hit. Shows each row's own
                        selling-price line total — the exact figure
                        (sellingValue = quantity * sellingPrice) that
                        productValuationTotal sums across every row below
                        — never a second, independently recomputed value.
                        Selling, not cost, because that is what actually
                        drives measuredBusinessWorth (the same "Venda" the
                        live entry screen's own primary/hero figure
                        already establishes, above). text-gray-500 (not
                        -400), matching this file's own established
                        contrast correction (see the "Custo:" captions'
                        own history, elsewhere in this file). */}
                    <span className="block text-[11px] text-gray-500 tabular-nums">
                      {formatCurrency(item.sellingValue, currencySymbol)}
                    </span>
                  </span>
                  {/* [Decision 40 — Validar Workflow, FR-N11;
                      Implementation Authorization §1 item 7] Only
                      offered for a previously-validated product — an
                      unvalidated one is already directly reachable and
                      editable via "Voltar" alone, so no separate
                      affordance is needed for it here. */}
                  {item.validated && (
                    <button
                      type="button"
                      onClick={() => handleCorrigirTallyItem(item)}
                      disabled={isSaving}
                      className="shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold text-[#0B1F3A] bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 transition-colors duration-150 disabled:opacity-60 whitespace-nowrap"
                    >
                      Corrigir
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* [Bug fix — Confirmar Contagem review screen was showing the
              cost-basis total (totalPurchaseValue) as "Valor Total da
              Contagem" with no qualifier, silently disagreeing with the
              live entry screen immediately before it (which already shows
              liveTally.totalSellingValue as its PRIMARY/hero figure — see
              that screen's own comment, above). This is the exact figure
              (pendingTally.totalSellingValue, same shape as
              productValuationTotal = normalizedTotalSellingValue in
              AppContext.tsx's recordStockCount) that becomes the new
              BusinessWorthSnapshot.measuredBusinessWorth's own valuation
              input the moment this count is confirmed — Business Worth is
              driven by selling/market value, not cost, exactly as the live
              screen already establishes. Read-only display fix: does not
              touch pendingTally itself, what gets saved, or any other
              field — recordStockCount already persists costPrice and
              sellingPrice on every item unchanged. */}
          <div className="card-dark-gradient rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
            <span className="font-semibold text-white/70 text-[13px]">Valor Total da Contagem</span>
            <span className="font-display font-semibold text-[22px] text-[#D4AF37] tabular-nums leading-none">
              {formatCurrency(pendingTally.totalSellingValue, currencySymbol)}
            </span>
          </div>

          {error && (
            <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-medium">
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
  // [Issue 2 — Periodic Contagem Live Selling-Price Readability] Five
  // tracks, matching the row's actual five top-level grid children
  // (Nome, Qtd, Unid, Venda/Un, Valor+ações) — not seven. Pre-§44 this
  // declared seven tracks for a row that still had a sixth
  // (Compra/Un) field; §44 removed that field without shrinking the
  // template, so the five real cells were auto-placed into the first
  // five of seven tracks, leaving two tracks unused and squeezing the
  // combined Valor+Validar/Editar/remover cell into a track sized for
  // a single input (112px) instead of a value-plus-actions cell. The
  // last track is widened (190px, versus the old Valor-only 120px) to
  // hold the currency value beside its action buttons without
  // wrapping. Any full-row element spanning every column (see
  // ModeAValuationControl, NewProductInfoPanel, ExistingProductSummary,
  // and the multi-portion label below) must use col-span-5 to match.
  const rowGridClass = 'grid grid-cols-2 sm:grid-cols-[minmax(0,2fr)_84px_76px_112px_190px] gap-x-2.5 gap-y-2.5 sm:items-end';

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
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-8 text-center text-sm text-gray-500">
          A verificar contagens por terminar...
        </div>
      </div>
    );
  }

  if (draftDecisionPending && periodicStockDraft) {
    // [Discard-Confirmation Safety Fix — Rule 8 Finding 1, Implementation
    // Authorization §1 item 1] The 'confirming'/'discarding' states
    // render a second card in place of the original banner — never
    // both at once, and "Começar de Novo" (idle) never itself calls
    // handleDiscardDraft. Retomar Contagem remains directly reachable
    // from every state, per the signed Implementation Plan.
    if (discardConfirmState !== 'idle') {
      return (
        <div className="max-w-2xl mx-auto py-16 space-y-5">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" strokeWidth={2} />
              </div>
              <div>
                <h2 className="type-title">Descartar Contagem por Terminar?</h2>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  A contagem {TYPE_LABELS[periodicStockDraft.type]} de {formatDate(periodicStockDraft.date)} ainda
                  não terminou.
                </p>
              </div>
            </div>
            <p className="text-[13px] text-gray-600 leading-relaxed">
              Se continuar, todos os dados desta contagem por terminar serão descartados permanentemente. Esta
              ação não pode ser desfeita.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => setDiscardConfirmState('idle')}
                disabled={discardConfirmState === 'discarding'}
                className="btn-secondary flex-1 py-3 px-4 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>Cancelar</span>
              </button>
              <button
                type="button"
                onClick={handleResumeDraft}
                disabled={discardConfirmState === 'discarding'}
                className="btn-secondary flex-1 py-3 px-4 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>Retomar Contagem</span>
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                disabled={discardConfirmState === 'discarding'}
                className="flex-1 py-3 px-4 text-sm rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <span>{discardConfirmState === 'discarding' ? 'A descartar...' : 'Começar Nova Contagem'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="max-w-2xl mx-auto py-16 space-y-5">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Undo2 className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="type-title">Contagem por Terminar Encontrada</h2>
              <p className="text-[13px] text-gray-500 mt-0.5">
                Existe uma contagem {TYPE_LABELS[periodicStockDraft.type]} por terminar de{' '}
                {formatDate(periodicStockDraft.date)}.
              </p>
            </div>
          </div>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            Pode retomar de onde parou, ou começar uma contagem nova a partir do zero.
          </p>
          <div className="flex items-center gap-3">
            {/* [Discard-Confirmation Safety Fix — Rule 8 Finding 1]
                No longer calls handleDiscardDraft directly — a single
                click here can never discard anything. It only opens
                the confirmation step above, which is the sole path to
                handleDiscardDraft. */}
            <button
              type="button"
              onClick={() => setDiscardConfirmState('confirming')}
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
            <p className="text-[13px] text-amber-700 mt-0.5">
              Esta contagem substitui o registo de Valor do Negócio atual — o registo anterior fica preservado no
              histórico, nunca é editado ou apagado.
            </p>
            {/* [Bug fix — Owner-reported] Confirms the original quantities
                were actually loaded, rather than leaving the Owner to
                wonder whether they're looking at a blank form or the real
                data they're meant to be correcting. */}
            <p className="text-[13px] text-amber-700 mt-1.5 font-semibold">
              Os produtos e quantidades da contagem original foram pré-preenchidos abaixo — reveja e corrija o que for
              necessário.
            </p>
            {correctionPrefillMissingCount > 0 && (
              <p className="text-[12px] text-amber-700 mt-1.5">
                {correctionPrefillMissingCount === 1
                  ? '1 produto da contagem original já não existe no catálogo e não pôde ser pré-preenchido — os dados originais permanecem guardados no histórico, apenas não aparecem aqui para edição.'
                  : `${correctionPrefillMissingCount} produtos da contagem original já não existem no catálogo e não puderam ser pré-preenchidos — os dados originais permanecem guardados no histórico, apenas não aparecem aqui para edição.`}
              </p>
            )}
            <button
              type="button"
              onClick={() => clearBusinessWorthCorrection()}
              className="text-[13px] text-amber-800 underline mt-2"
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
            <p className="text-[13px] text-gray-500 mt-0.5">
              Registe uma nova contagem física para acompanhar a evolução do seu capital.
            </p>
          </div>
          {/* [Implementation Task, Section 4/§1a] Draft durability status —
              a deliberately distinct UI signal from isSaving/savedMessage
              below, never collapsed into the same indicator (frozen spec
              §1a: "the user's work is durable" and "the final business
              transaction has been committed" must never share a signal). */}
          {draftSaveState !== 'editing' && (
            <span className="text-[13px] text-gray-500 shrink-0 font-medium">
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
          <p className="text-[13px] leading-relaxed text-gray-600">
            {/* [Capital Inicial Retirement — Implementation Authorization
                Increment 6; Specification §44.1/FR-70] Conditional copy
                (Implementation Plan §Increment 6, option a) — the exact
                prior wording is preserved verbatim for a business that
                HAS a preserved historical Capital Inicial record;
                generic wording names no retired concept for one that
                doesn't. The expectedCurrentStockValue arithmetic itself
                (AppContext.tsx, initialCapitalValue +
                totalInvestmentValueAllTime) is completely unchanged —
                this is copy-only. */}
            Esta contagem regista o que existe fisicamente em stock agora. Será comparada com o{' '}
            <strong className="text-[#111827] font-semibold">Valor Esperado de Stock</strong> —{' '}
            {hasInitialStockCount
              ? 'o Capital Inicial mais o valor (a custo) do stock em lote atualmente registado'
              : 'o valor de compras registadas (a custo)'}
            {' '}— para mostrar se o valor do seu inventário corresponde ao que o sistema esperava.
          </p>
        </div>

        {productsError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3.5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-[3px]" strokeWidth={2.25} />
              <p className="text-[13px] leading-relaxed text-rose-700">
                Não foi possível carregar os produtos. Isto não significa que o seu catálogo esteja vazio.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-bold text-rose-700 hover:text-rose-900"
            >
              <RotateCw className="w-3.5 h-3.5" strokeWidth={2.25} />
              Tentar novamente
            </button>
          </div>
        )}

        {error && (
          <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-medium">
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

          {/* [Fix — product search only filtered the catalog grid] One
              shared search box, above BOTH product sections, filtering
              catalog rows (visibleCatalogEntries) AND manually-added
              products (visibleManualRowGroups) by the same query — see
              visibleManualRowGroups' own comment above for why this
              moved here rather than staying inside "Produtos do
              Catálogo"'s own header. Lets an Owner jump straight to one
              product out of a long list (after spotting an error
              mid-Contagem, for example) regardless of which of the two
              sections it happens to live in. */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={2.25} />
            <input
              type="text"
              placeholder="Procurar um produto para editar..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className={`${fieldClass} pl-8`}
            />
          </div>

          {/* Catalog-populated product grid — Amendment Part 7/11 */}
          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[13px] font-bold text-[#111827]">
                Produtos do Catálogo
                <span className="text-gray-500 font-normal ml-1.5">({visibleCatalogEntries.length})</span>
              </p>
            </div>

            {products.length === 0 && !productsError && (
              <p className="text-[13px] text-gray-500 italic mt-3">
                Ainda não tem produtos no catálogo. Adicione um manualmente abaixo.
              </p>
            )}

            {products.length > 0 && productSearch.trim() && visibleCatalogEntries.length === 0 && (
              <p className="text-[13px] text-gray-500 italic mt-3">Nenhum produto encontrado para "{productSearch.trim()}".</p>
            )}

            {visibleCatalogEntries.length > 0 && (
              <>
                <div className="space-y-2.5 mt-3">
                  {visibleCatalogEntries.map(([productId, row]) => {
                    const isBlank = row.quantity.trim() === '';
                    const q = isBlank ? 0 : Number(row.quantity) || 0;
                    // [Selling-first per-row display] Selling value is
                    // always the raw quantity * sellingPrice — never
                    // basis-derived like cost, because Mode A already
                    // writes the DERIVED price directly onto this row's
                    // own sellingPrice field before this ever runs
                    // (contagemMultiUnitValuation.ts's own header
                    // comment: "produces ORDINARY per-portion
                    // sellingPrice values that flow through the
                    // EXISTING, UNMODIFIED path" — Mode A and Mode B are
                    // indistinguishable from this point on, by design).
                    const rowSellingValue = q * (Number(row.sellingPrice) || 0);
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
                    //
                    // [Bug fix — Mode A unavailable for a single-portion
                    // product] Previously required isMultiPortion (2+
                    // portions of the same product) before Mode A could
                    // even be offered — meaning a product counted in only
                    // ONE unit (e.g. "2 Cx", nothing else) never got the
                    // option at all, forcing a manual reference-price
                    // conversion by hand (the exact 1400-vs-correct-1440
                    // slip this fix responds to). Mode A's own arithmetic
                    // (deriveModeAPortionValuations) never required more
                    // than one portion — the gate was a stricter UI-only
                    // restriction than the underlying feature needed.
                    // Simply "this row is portion #1" now covers both a
                    // lone portion (portionIndex 1, portionCount 1) and
                    // the first portion of a genuinely multi-portion
                    // group identically — the control renders once per
                    // product either way, never once per portion.
                    const isFirstPortionOfMultiPortionGroup = portionLabel.portionIndex === 1;
                    // [Feature — per-row Save + confirm; Decision 40 —
                    // Validar Workflow] Green = this row's own Validar
                    // action passed validation. Red = not yet
                    // validated — whether still blank (never examined)
                    // or filled in but not yet validated. Never gated
                    // on quantity > 0: an explicitly-typed 0
                    // (genuinely out of stock) is just as validly
                    // green as any other quantity, per
                    // validateWorkingRowForSave above. Since this loop
                    // only ever renders `visibleCatalogEntries` (which
                    // already excludes any row with `validated: true`,
                    // above), `isConfirmed` is always false for a row
                    // that reaches this point — kept as an explicit,
                    // named value (rather than removing the
                    // conditional entirely) so the Validar/Editar
                    // branch below stays structurally identical to the
                    // manual-row rendering's own equivalent, and so a
                    // row mid-transition (validated this render,
                    // filtered out on the next) never flashes a
                    // mismatched dot in between.
                    const isConfirmed = row.validated === true;
                    const saveError = catalogRowSaveError[productId];
                    return (
                      <div
                        key={productId}
                        className={`group ${rowGridClass} bg-white rounded-2xl border border-[#F0EEE4] shadow-[0_1px_2px_rgba(11,31,58,0.03),0_6px_16px_-10px_rgba(212,175,55,0.16)] hover:shadow-[0_2px_4px_rgba(11,31,58,0.04),0_10px_22px_-10px_rgba(212,175,55,0.24)] px-3.5 py-3.5 transition-shadow duration-150`}
                      >
                        <div className="col-span-2 sm:col-span-1 flex items-center gap-1">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${isConfirmed ? 'bg-emerald-400' : 'bg-rose-300'}`}
                            aria-hidden="true"
                            title={isConfirmed ? 'Validado' : 'Ainda não validado'}
                          />
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
                              new grouping logic.

                              [UI Discoverability & Readability Corrections —
                              Item 1] Was persistently invisible at ≥640px
                              (sm:opacity-0, revealed only on row hover or
                              focus-within) — an add-data capability, not a
                              secondary/destructive action, so hover-gating
                              it the same way a delete button is hover-gated
                              made it undiscoverable without already knowing
                              it existed. Now persistently visible at every
                              breakpoint; only the hover COLOR change
                              (text-gray-300 → navy, transparent →
                              gold-tinted background) remains
                              interaction-dependent, exactly as before. No
                              change to onClick, aria-label, title, icon, or
                              position. */}
                          <button
                            type="button"
                            onClick={() => handleAddPortionToManualGroup(row.productName)}
                            aria-label={`Adicionar porção de ${row.productName}`}
                            title="Adicionar Porção"
                            className="shrink-0 p-1 rounded-lg text-gray-300 hover:text-[#0B1F3A] hover:bg-[#D4AF37]/10 transition-all duration-150"
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
                          // [Issue 2] col-span-5, see rowGridClass above.
                          <div className="col-span-2 sm:col-span-5 -mt-1 mb-0.5">
                            <p className="text-[12px] text-[#B8952F] font-medium leading-snug">
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
                            // [Bug fix — Mode A unavailable for a
                            // genuinely new product] Was
                            // getUnitRelationshipForProductName alone
                            // (catalog-only) — see that helper's own
                            // sibling comment above for the full
                            // explanation. Falls back to the same
                            // newProductInfo-derived candidate
                            // handleConfirmSave already builds at
                            // submit time.
                            const relationship = getEffectiveUnitRelationshipForProductName(row.productName);
                            if (!relationship || !isValidUnitRelationship(relationship)) return null;
                            // [Implementation Authorization §14 item 2]
                            // Always available once a valid relationship
                            // exists — no explicit "activate" step.
                            const config = getEffectiveReferenceConfig(key);
                            const referenceUnitOptions = relationship.units.map((u) => u.unit);
                            const effectiveReferenceUnit = config.referenceUnit;
                            return (
                              <ModeAValuationControl
                                referenceUnitOptions={referenceUnitOptions}
                                referenceUnit={effectiveReferenceUnit}
                                referencePrice={config.referencePrice}
                                currencySymbol={currencySymbol}
                                allPortionsConvertible={canApplyModeA(collectGroupPortions(key), effectiveReferenceUnit, relationship)}
                                onChange={(fields) => handleReferenceConfigChange(key, fields)}
                              />
                            );
                          })()}

                        {/* [Decision 37, B.1 completion] Read-only
                            counterpart to NewProductInfoPanel — a
                            catalog row is never "genuinely new", so no
                            additional gate is needed here beyond
                            isFirstPortionOfMultiPortionGroup, mirroring
                            Mode A's own gate above. Renders nothing
                            without a remembered cost basis/relationship
                            (ExistingProductSummary's own null-return). */}
                        {isFirstPortionOfMultiPortionGroup && (
                          <ExistingProductSummary
                            productName={row.productName}
                            currencySymbol={currencySymbol}
                            costBasis={costBasisByProductName.get(productKeyFor(row.productName))}
                            relationship={getUnitRelationshipForProductName(row.productName)}
                          />
                        )}

                        <div>
                          <label className={fieldLabelClass}>Qtd</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Ainda não contado"
                            value={row.quantity}
                            onChange={(e) => updateCatalogRow(productId, { quantity: e.target.value })}
                            disabled={isConfirmed}
                            className={`${fieldClass} font-mono tabular-nums ${isBlank ? 'placeholder:text-amber-500/70' : ''} ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                          />
                        </div>

                        <div>
                          <label className={fieldLabelClass}>Unid</label>
                          <input
                            type="text"
                            placeholder="un"
                            value={row.unit}
                            onChange={(e) => updateCatalogRow(productId, { unit: e.target.value })}
                            disabled={isConfirmed}
                            className={`${fieldClass} font-mono text-center ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                          />
                        </div>

                        {/* [§44 — Periodic Contagem Cost-Price Removal,
                            FR-71; Implementation Authorization §2 item 3]
                            The purchase-unit-portion Cost Price input
                            (formerly here, "Compra/Un") is removed — the
                            Owner is no longer asked to enter Cost Price
                            during Periodic Contagem, for any portion, of
                            any unit. Every non-purchase-unit portion was
                            already suppressed by isCostFieldSuppressed
                            (Decision 37, B.4, unchanged); this closes the
                            one remaining case. The cost figure, where a
                            governed basis exists, continues to be derived
                            exactly as before (FR-72, unchanged
                            arithmetic) — only the Owner-facing input and
                            its attached deviation warning are removed
                            (FR-77's cost-side retirement). No replacement
                            input, workaround, or new fallback source is
                            introduced. */}

                        <div>
                          <label className={fieldLabelClass}>Venda/Un ({currencySymbol})</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.sellingPrice}
                            onChange={(e) => updateCatalogRow(productId, { sellingPrice: e.target.value })}
                            disabled={isConfirmed}
                            className={`${fieldClass} font-mono tabular-nums ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                          />
                          {/* [Bug fix — "Venda/Un"/"Compra/Un" ambiguity]
                              For a multi-unit product "Un" is ALSO the
                              literal name of the smallest chain unit
                              (Cx/Emb/Un), so an Owner easily misreads
                              this as "price per bottle" even when this
                              row's own Unid is Cx or Emb. This caption
                              directly names THIS row's actual selected
                              unit, so the price's real meaning is
                              unambiguous regardless of which unit is
                              selected. */}
                          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                            {currencySymbol} por {(row.sellingPriceBasisUnit ?? row.unit).trim() || 'un'}
                          </p>
                          {/* [Manual data-entry error investigation,
                              Finding 3] Live-computed, never stored state
                              — compares the CURRENTLY TYPED selling price
                              against the product's own remembered price
                              (getRememberedPriceForRow, above), converted
                              to this row's current unit. [§44 — Periodic
                              Contagem Cost-Price Removal, FR-77] The
                              cost-side counterpart of this check
                              (formerly here) is retired — there is no
                              longer an Owner-typed Cost Price to check.
                              This Selling Price check is unaffected and
                              continues to operate exactly as before. */}
                          {(() => {
                            const check = checkPriceDeviation(parseFloat(row.sellingPrice), getRememberedPriceForRow(row, 'selling'));
                            if (!check.showWarning) return null;
                            return (
                              <p className="text-[11px] text-amber-600 font-medium mt-0.5 leading-snug">
                                Este preço é {Math.round(check.deviationPercent! * 100)}%{' '}
                                {check.isAboveRemembered ? 'acima' : 'abaixo'} do último preço registado para
                                este produto — confirme que não é um erro de digitação.
                              </p>
                            );
                          })()}
                        </div>

                        <div className="flex items-end gap-1.5">
                          <div className="flex-1 min-w-0">
                            {/* [§44 — Periodic Contagem Cost-Price
                                Removal — Implementation Clarification]
                                The per-row "Custo: X" secondary caption
                                (formerly here) is removed. FR-71 removes
                                Owner-entered Cost Price from Periodic
                                Contagem; leaving a per-row Cost
                                presentation would keep Cost Price as an
                                Owner-facing concept in the very interface
                                it was removed from. Selling Value remains
                                the sole per-row figure — no replacement
                                cost UI or anomaly indicator introduced. */}
                            <label className={fieldLabelClass}>Valor</label>
                            {/* [Issue 2 — Periodic Contagem Live
                                Selling-Price Readability] The previous
                                word-breaking utility class previously let
                                a currency value split mid-number (e.g.
                                "2,345 MZN") once rowGridClass's stale
                                seven-track template squeezed this cell
                                after §44 removed Compra/Un — see
                                rowGridClass's own comment above.
                                whitespace-nowrap keeps the figure on one
                                line; overflow-hidden + text-ellipsis is
                                the same safety net already used for "Não
                                contado" and other single-line fields
                                elsewhere in this file, so an
                                unexpectedly long value truncates
                                visually instead of breaking the row's
                                height or splitting digits.
                                Calculation/formatting (formatCurrency,
                                rowSellingValue) is untouched. */}
                            <div
                              className={`w-full rounded-[10px] px-2.5 py-2 text-[13px] type-number tabular-nums leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${
                                isBlank ? 'bg-amber-50 text-amber-600' : 'bg-[#F6EFD9] text-[#633806]'
                              }`}
                            >
                              {isBlank ? 'Não contado' : formatCurrency(rowSellingValue, currencySymbol)}
                            </div>
                            {/* [Feature — per-row Save + confirm] Shown
                                right on the row the moment Save fails
                                its own validation — never only
                                discovered later, buried in the final
                                review. */}
                            {saveError && (
                              <p className="text-[11px] text-rose-600 font-semibold mt-1 leading-snug">{saveError}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            {/* [Feature — per-row Save + confirm,
                                Owner-requested; Decision 40 —
                                Validar Workflow] Validar validates and
                                moves this one row out of the active
                                workspace into the accumulated/
                                validated area, below — independent of
                                the final "Confirmar Contagem" review,
                                which still runs across everything as a
                                last safety net. Re-opening an already-
                                validated row is possible from either
                                the accumulated area (below) or the
                                review screen's "Corrigir" — both route
                                through the same "queres editar?"-gated
                                handleEditCatalogRow, above. */}
                            {isConfirmed ? (
                              <button
                                type="button"
                                onClick={() => handleEditCatalogRow(productId)}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors duration-150 whitespace-nowrap"
                              >
                                Editar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSaveCatalogRow(productId)}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold text-[#0B1F3A] bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 transition-colors duration-150 whitespace-nowrap"
                              >
                                Validar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveCatalogRow(productId)}
                              aria-label={`Remover ${row.productName}`}
                              className="shrink-0 p-1.5 rounded-lg text-gray-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {removedCatalogEntries.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[13px] text-gray-500 mr-1">Removidos desta contagem:</span>
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
              37, B.3). rowGridClass's own layout is preserved for the
              shared field row (Qtd/Unid/Compra/Venda/Valor/remove) —
              only the "Nome" column moves up to the card header, shown
              once per card instead of once per portion. */}
          {manualRows.length > 0 && (
            <div>
              <p className="text-[13px] font-bold text-[#111827] mb-2">
                Adicionados Manualmente
                <span className="text-gray-500 font-normal ml-1.5">({visibleManualRowGroups.length})</span>
              </p>
              {/* [Fix — Owner had to keep scrolling back up to a shared
                  header to know which field was which] The per-field
                  labels below (Qtd/Unid/Compra/Venda/Valor) are no
                  longer `sm:hidden` — every field now carries its own
                  always-visible label directly above its own input, on
                  every screen size, so the row itself always says what
                  it wants filled in, with nothing to scroll up for. This
                  also removes the need for a shared top header row
                  (previously here and in the catalog-rows section above)
                  — which could never correctly label every row anyway,
                  since Compra/Un is genuinely absent on some rows (a
                  suppressed, non-purchase-unit portion — see
                  isCostFieldSuppressed) and present on others; one fixed
                  header could not describe both. */}
              {productSearch.trim() && visibleManualRowGroups.length === 0 && (
                <p className="text-[13px] text-gray-500 italic py-3">Nenhum produto encontrado para "{productSearch.trim()}".</p>
              )}
              <div className="space-y-3">
                {visibleManualRowGroups.map((group) => {
                  const firstIdx = group.rows[0].idx;
                  const firstRowLabel = portionLabels.get(`manual-${firstIdx}`) ?? { isMultiPortion: false, portionIndex: 1, portionCount: 1 };
                  // Same semantics as before B.3: Mode A is only ever
                  // relevant here when this card's own first portion is
                  // ALSO the group's overall first portion across
                  // catalog+manual combined (i.e. no catalog row shares
                  // this name) — otherwise Mode A already renders on the
                  // catalog side, exactly as it did before this item.
                  //
                  // [Bug fix — Mode A unavailable for a single-portion
                  // product] See the catalog-row loop's identical fix
                  // and comment, above — same reasoning, same relaxed
                  // gate. Dropping the isMultiPortion requirement does
                  // NOT reopen the "avoid rendering Mode A twice for one
                  // product" property this comment describes:
                  // portionIndex === 1 already, by itself, identifies
                  // exactly one portion (the overall first, across both
                  // loops) regardless of how many total portions exist —
                  // isMultiPortion was only ever an ADDITIONAL, stricter
                  // restriction on top of that, never load-bearing for
                  // this de-duplication.
                  const cardIsFirstPortionOfMultiPortionGroup = firstRowLabel.portionIndex === 1;
                  const isNewProduct = isGenuinelyNewProductName(group.displayName);
                  return (
                    <div key={`manual-group-${firstIdx}`} className="rounded-2xl bg-white border border-[#F0EEE4] shadow-[0_1px_2px_rgba(11,31,58,0.03),0_6px_16px_-10px_rgba(212,175,55,0.16)] px-3.5 py-3.5 space-y-1.5">
                      <div>
                        <label className={fieldLabelClass}>Nome</label>
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
                          // [Bug fix — Mode A unavailable for a
                          // genuinely new product] See the catalog-row
                          // loop's identical fix, above, for the full
                          // explanation — this is precisely the case a
                          // live screenshot showed: a "PRODUTO NOVO"
                          // like "Lite 330ml" only ever renders through
                          // THIS manual-row loop (it has no catalog row
                          // at all yet), so this call site is the one
                          // that actually needed the fix for that
                          // screenshot's own product to get Mode A.
                          const relationship = getEffectiveUnitRelationshipForProductName(group.displayName);
                          if (!relationship || !isValidUnitRelationship(relationship)) return null;
                          // [Implementation Authorization §14 item 2]
                          // Always available once a valid relationship
                          // exists — no explicit "activate" step.
                          const config = getEffectiveReferenceConfig(key);
                          const referenceUnitOptions = relationship.units.map((u) => u.unit);
                          const effectiveReferenceUnit = config.referenceUnit;
                          return (
                            <ModeAValuationControl
                              referenceUnitOptions={referenceUnitOptions}
                              referenceUnit={effectiveReferenceUnit}
                              referencePrice={config.referencePrice}
                              currencySymbol={currencySymbol}
                              allPortionsConvertible={canApplyModeA(collectGroupPortions(key), effectiveReferenceUnit, relationship)}
                              onChange={(fields) => handleReferenceConfigChange(key, fields)}
                            />
                          );
                        })()}

                      {/* [B.1; extended by B.2] Shown ONLY for a
                          genuinely-new product, rendered once per CARD.
                          Data lives in newProductInfo, keyed by name. */}
                      {isNewProduct &&
                        (() => {
                          const key = productKeyFor(group.displayName);
                          const info = newProductInfo[key] ?? { purchaseUnit: '', relationshipSteps: [], sellingUnit: '' };
                          const setInfo = (
                            fields: Partial<{ purchaseUnit: string; relationshipSteps: { unit: string; factor: string }[]; sellingUnit: string }>
                          ) => {
                            // [Decision 38 Amendment, Implementation Task
                            // §5b; Implementation Authorization §2 item 5;
                            // Decision 39a] Before this amendment, entering
                            // a new product's purchase unit/cost/
                            // relationship here was never persisted at
                            // all — it lived only in this transient
                            // useState and was lost on any interruption.
                            // [Decision 39a] Keyed by this new product's
                            // own key — independent of every catalog/
                            // manual row's own timer, and of every OTHER
                            // new product's own entry.
                            const nextInfo = {
                              ...newProductInfo,
                              [key]: {
                                ...(newProductInfo[key] ?? { purchaseUnit: '', relationshipSteps: [], sellingUnit: '' }),
                                ...fields,
                              },
                            };
                            setNewProductInfo(nextInfo);
                            scheduleRowDraftSave(`newProductInfo:${key}`);
                          };
                          // [B.2 Selling Unit Capture Extension] same
                          // "complete step" filter both construction
                          // sites already use.
                          const completeSteps = (info.relationshipSteps || []).filter(
                            (s) => s.unit.trim() && Number.isFinite(parseFloat(s.factor)) && parseFloat(s.factor) > 0
                          );
                          const sellingUnitOptions =
                            completeSteps.length > 0 ? [info.purchaseUnit.trim() || 'un', ...completeSteps.map((s) => s.unit.trim())] : [];
                          // Derived reset, mirrors effectiveReferenceUnit.
                          const effectiveSellingUnit =
                            info.sellingUnit && sellingUnitOptions.includes(info.sellingUnit) ? info.sellingUnit : '';
                          return (
                            <NewProductInfoPanel
                              productName={group.displayName}
                              currencySymbol={currencySymbol}
                              purchaseUnit={info.purchaseUnit || ''}
                              onPurchaseUnitChange={(value) => setInfo({ purchaseUnit: value })}
                              relationshipSteps={info.relationshipSteps || []}
                              onRelationshipStepsChange={(steps) => setInfo({ relationshipSteps: steps })}
                              sellingUnitOptions={sellingUnitOptions}
                              sellingUnit={effectiveSellingUnit}
                              onSellingUnitChange={(value) => setInfo({ sellingUnit: value })}
                            />
                          );
                        })()}

                      {/* [Business Worth Evolution — Decision 37, B.1
                          completion] Sibling of NewProductInfoPanel
                          immediately above — renders instead of it
                          when this card's product already exists in
                          the catalog (!isNewProduct), for the one case
                          NewProductInfoPanel's own gate deliberately
                          excludes: an existing product whose current
                          Contagem portions are entirely manual rows
                          (e.g. its catalog row was removed from this
                          count — handleRemoveCatalogRow — and
                          re-typed manually). Same
                          cardIsFirstPortionOfMultiPortionGroup gate as
                          NewProductInfoPanel, so exactly one of the two
                          ever renders per card, never both. Renders
                          nothing when the product has no remembered
                          cost basis or relationship yet. */}
                      {!isNewProduct && cardIsFirstPortionOfMultiPortionGroup && (
                        <ExistingProductSummary
                          productName={group.displayName}
                          currencySymbol={currencySymbol}
                          costBasis={costBasisByProductName.get(productKeyFor(group.displayName))}
                          relationship={getUnitRelationshipForProductName(group.displayName)}
                        />
                      )}

                      <div className="space-y-1">
                        {/* [Decision 40 — Validar Workflow, FR-N8/FR-N9;
                            Implementation Authorization §1 item 4]
                            Filtered here, at the render site, rather
                            than in `manualRowGroups`/
                            `visibleManualRowGroups` themselves (which
                            stay unfiltered — see those memos' own
                            comments) — a validated portion is excluded
                            from THIS active-workspace loop only, never
                            spliced or reordered in `manualRows` itself.
                            It reappears in the accumulated/validated
                            list, below, driven by the separate
                            `validatedManualRowEntries` memo built from
                            the same, unmutated `manualRows`. */}
                        {group.rows.filter(({ idx }) => !manualRows[idx]?.validated).map(({ idx }) => {
                          const row = manualRows[idx];
                          const portionLabel = portionLabels.get(`manual-${idx}`) ?? { isMultiPortion: false, portionIndex: 1, portionCount: 1 };
                          // [Decision 40 — Validar Workflow] Read
                          // directly from the persisted row field —
                          // replaces the prior local-only
                          // `confirmedManualRowIndices` Set.
                          const isConfirmed = row.validated === true;
                          const saveError = manualRowSaveError[idx];
                          return (
                            <div key={idx} className={`group ${rowGridClass} rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-[#FAFBFC]`}>
                              <div className="col-span-2 sm:col-span-1 flex items-center gap-1">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${isConfirmed ? 'bg-emerald-400' : 'bg-rose-300'}`}
                                  aria-hidden="true"
                                  title={isConfirmed ? 'Validado' : 'Ainda não validado'}
                                />
                                {/* [Increment B, Checkpoint B6 —
                                    Consolidated Specification §17] Same
                                    informational-only label as before
                                    B.3 — still meaningful when this
                                    card's portions are only PART of a
                                    larger group that also includes a
                                    catalog row. */}
                                {portionLabel.isMultiPortion && (
                                  <p className="text-[12px] text-[#B8952F] font-medium leading-snug">
                                    Porção {portionLabel.portionIndex} de {portionLabel.portionCount} — mesmo produto, será somado no total
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className={fieldLabelClass}>Qtd</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Ainda não contado"
                                  value={row.quantity}
                                  onChange={(e) => updateManualRow(idx, { quantity: e.target.value })}
                                  disabled={isConfirmed}
                                  className={`${fieldClass} font-mono tabular-nums ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                                />
                              </div>

                              <div>
                                <label className={fieldLabelClass}>Unid</label>
                                <input
                                  type="text"
                                  value={row.unit}
                                  onChange={(e) => updateManualRow(idx, { unit: e.target.value })}
                                  disabled={isConfirmed}
                                  className={`${fieldClass} font-mono text-center ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                                />
                              </div>

                              {/* [§44 — Periodic Contagem Cost-Price
                                  Removal, FR-71; Implementation
                                  Authorization §2 item 3] The
                                  purchase-unit-portion Cost Price input
                                  (formerly here, "Compra/Un") is removed
                                  from the manual-row path too — same
                                  reasoning as the catalog-row block,
                                  above. Non-purchase-unit suppression
                                  (isCostFieldSuppressed, Decision 37,
                                  B.4) is unchanged; this closes the one
                                  remaining case for a manually-added
                                  product's own portion rows. */}

                              <div>
                                <label className={fieldLabelClass}>Venda/Un ({currencySymbol})</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={row.sellingPrice}
                                  onChange={(e) => updateManualRow(idx, { sellingPrice: e.target.value })}
                                  disabled={isConfirmed}
                                  className={`${fieldClass} font-mono tabular-nums ${isConfirmed ? 'opacity-60 cursor-not-allowed' : ''}`}
                                />
                                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                                  {currencySymbol} por {(row.sellingPriceBasisUnit ?? row.unit).trim() || 'un'}
                                </p>
                                {/* [Manual data-entry error investigation,
                                    Finding 3] Selling Price deviation
                                    check — unaffected by §44. [§44] The
                                    cost-side counterpart (formerly here)
                                    is retired, per FR-77 — no Owner-typed
                                    Cost Price remains to check. */}
                                {(() => {
                                  const check = checkPriceDeviation(parseFloat(row.sellingPrice), getRememberedPriceForRow(row, 'selling'));
                                  if (!check.showWarning) return null;
                                  return (
                                    <p className="text-[11px] text-amber-600 font-medium mt-0.5 leading-snug">
                                      Este preço é {Math.round(check.deviationPercent! * 100)}%{' '}
                                      {check.isAboveRemembered ? 'acima' : 'abaixo'} do último preço registado
                                      para este produto — confirme que não é um erro de digitação.
                                    </p>
                                  );
                                })()}
                              </div>

                              <div className="flex items-end gap-1.5">
                                <div className="flex-1 min-w-0">
                                  {/* [§44 — Periodic Contagem Cost-Price
                                      Removal — Implementation
                                      Clarification] The per-row "Custo: X"
                                      caption (formerly here) is removed —
                                      same reasoning as the catalog-row
                                      block, above. Selling Value remains
                                      the sole per-row figure. */}
                                  <label className={fieldLabelClass}>Valor</label>
                                  {/* [Issue 2 — Periodic Contagem Live
                                      Selling-Price Readability] Same
                                      correction as the catalog-row Valor
                                      box, above — see that comment for
                                      why the previous word-breaking
                                      utility class is replaced here
                                      too. */}
                                  <div
                                    className={`w-full rounded-[10px] px-2.5 py-2 text-[13px] type-number tabular-nums leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${
                                      row.quantity.trim() === '' ? 'bg-amber-50 text-amber-600' : 'bg-[#F6EFD9] text-[#633806]'
                                    }`}
                                  >
                                    {row.quantity.trim() === ''
                                      ? 'Não contado'
                                      : formatCurrency(
                                          (Number(row.quantity) || 0) * (Number(row.sellingPrice) || 0),
                                          currencySymbol
                                        )}
                                  </div>
                                  {/* [Feature — per-row Save + confirm]
                                      Same as the catalog row's own
                                      identical error display, above. */}
                                  {saveError && (
                                    <p className="text-[11px] text-rose-600 font-semibold mt-1 leading-snug">{saveError}</p>
                                  )}
                                </div>
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                  {/* [Feature — per-row Save + confirm;
                                      Decision 40 — Validar Workflow]
                                      Manual-row counterpart to the
                                      catalog row's own identical
                                      Validar/Editar pair, above. */}
                                  {isConfirmed ? (
                                    <button
                                      type="button"
                                      onClick={() => handleEditManualRow(idx)}
                                      className="px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors duration-150 whitespace-nowrap"
                                    >
                                      Editar
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSaveManualRow(idx)}
                                      className="px-2 py-1 rounded-lg text-[11px] font-bold text-[#0B1F3A] bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 transition-colors duration-150 whitespace-nowrap"
                                    >
                                      Validar
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveManualRow(idx)}
                                    aria-label={`Remover porção`}
                                    className="shrink-0 p-1.5 rounded-lg text-gray-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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
                        className="w-full py-2 px-3 rounded-lg border border-dashed border-[#E5E7EB] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.05] text-gray-500 hover:text-[#0B1F3A] font-bold text-[13px] transition-all duration-150 flex items-center justify-center gap-1.5 group"
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
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#E5E7EB] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.05] text-gray-500 hover:text-[#0B1F3A] font-bold text-[13px] transition-all duration-150 flex items-center justify-center gap-2 group"
          >
            <Plus className="w-3.5 h-3.5 text-[#D4AF37] group-hover:scale-110 transition-transform duration-150" />
            <span>Adicionar produto que não está no catálogo</span>
          </button>

          {/* [Decision 40 — Validar Workflow, FR-N8; Implementation
              Authorization §1 item 5] The accumulated/validated area —
              structurally parallel to "Removidos desta contagem",
              above, but combining BOTH catalog and manual validated
              entries into one list, since from the Owner's point of
              view "Validar" moves a product into the same accumulated
              place regardless of which section it started in. Every
              entry here remains fully present in `catalogRows`/
              `manualRows` (never removed, never spliced — see
              `visibleCatalogEntries`/`validatedManualRowEntries`'s own
              comments, above); this list only reads the already-
              computed `validatedCatalogEntries`/
              `validatedManualRowEntries` derived views. Reopening
              reuses the EXISTING `handleEditCatalogRow`/
              `handleEditManualRow` functions unchanged — the same
              "queres editar?"-gated, `validated: false`-setting write
              path already used by the in-row "Editar" button, so a
              row reopened from here behaves identically to one
              reopened from the active workspace's own Editar control. */}
          {(validatedCatalogEntries.length > 0 || validatedManualRowEntries.length > 0) && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 py-3.5 space-y-2">
              <p className="text-[13px] font-bold text-emerald-800">
                Produtos Validados
                <span className="font-normal text-emerald-700/70 ml-1.5">
                  ({validatedCatalogEntries.length + validatedManualRowEntries.length})
                </span>
              </p>
              <p className="text-[11px] text-emerald-700/70 leading-relaxed">
                Já verificados e fora do espaço de contagem ativo. Continuam a fazer
                parte desta Contagem e serão revistos antes de "Confirmar Contagem".
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {validatedCatalogEntries.map(([productId, row]) => {
                  const q = row.quantity.trim() === '' ? 0 : Number(row.quantity) || 0;
                  return (
                    <button
                      key={`validated-catalog-${productId}`}
                      type="button"
                      onClick={() => handleEditCatalogRow(productId)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-white border border-emerald-200 hover:bg-emerald-100 rounded-full pl-2.5 pr-2 py-1 transition-colors duration-150"
                    >
                      {row.productName}
                      <span className="text-emerald-600/70 font-normal tabular-nums">
                        {q} {row.unit || 'un'}
                      </span>
                      <Pencil className="w-2.5 h-2.5" strokeWidth={2.5} />
                    </button>
                  );
                })}
                {validatedManualRowEntries.map(({ idx, row }) => {
                  const q = row.quantity.trim() === '' ? 0 : Number(row.quantity) || 0;
                  return (
                    <button
                      key={`validated-manual-${idx}`}
                      type="button"
                      onClick={() => handleEditManualRow(idx)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-white border border-emerald-200 hover:bg-emerald-100 rounded-full pl-2.5 pr-2 py-1 transition-colors duration-150"
                    >
                      {row.productName}
                      <span className="text-emerald-600/70 font-normal tabular-nums">
                        {q} {row.unit || 'un'}
                      </span>
                      <Pencil className="w-2.5 h-2.5" strokeWidth={2.5} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* [§44 — Periodic Contagem Cost-Price Removal, FR-74; Rule 8
              Finding 4 (confirmed by Product Architect: total + trend
              indicator removed together, as one unit); Implementation
              Authorization §2 item 4, §5] The live cost-total secondary
              line ("Valor Físico (Custo) Contado até Agora") and its
              cost-basis "vs. Valor Esperado" trend indicator (formerly
              here, driven by comparisonBaseline/diff/diffPct) are both
              removed. Selling-price total is the SOLE live total shown
              during entry: the exact figure (liveTally.totalSellingValue,
              same shape as productValuationTotal =
              normalizedTotalSellingValue in AppContext.tsx's
              recordStockCount) that becomes the new
              BusinessWorthSnapshot.measuredBusinessWorth's own valuation
              input the moment this count is confirmed — Business Worth is
              driven by selling/market value here, not cost. No
              replacement cost-anomaly indicator is introduced. */}
          <div className="card-dark-gradient rounded-2xl px-5 py-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-white/70 text-[13px]">Valor de Venda Contado até Agora</span>
              <span className="font-display font-semibold text-[22px] sm:text-[24px] text-[#D4AF37] tabular-nums leading-none">
                {formatCurrency(liveTally.totalSellingValue, currencySymbol)}
              </span>
            </div>
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
                <button
                  type="button"
                  key={count.id}
                  onClick={() => setViewingCount(count)}
                  className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 -mx-2.5 transition-colors duration-150 hover:bg-[#FAFBFC] text-left"
                >
                  <div>
                    <p className="text-[13px] font-bold text-[#111827]">
                      {count.label || TYPE_LABELS[count.type]}
                    </p>
                    <p className="text-[13px] text-gray-500 mt-0.5">{formatDate(count.date)} · {count.items.length} produtos</p>
                  </div>
                  <div className="text-right">
                    <span className="type-number text-sm text-[#111827] tabular-nums block">
                      {formatCurrency(count.totalValue, currencySymbol)}
                    </span>
                    {/* [Amendment v1.0, Part 5] Historical snapshot — only
                        present on counts recorded after this amendment;
                        never recalculated from the live formula. */}
                    {typeof count.expectedValueAtCount === 'number' && (
                      <span className="text-[12px] text-gray-500 tabular-nums block mt-0.5">
                        vs. {formatCurrency(count.expectedValueAtCount, currencySymbol)} esperado
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* [Feature — Owner-requested: "view counted products, quantities
          and totals" after a count is done, real client complaint] A
          read-only detail view for any past count — never gated by the
          3-hour correction window (that gate applies only to EDITING,
          via the separate "Corrigir" entry point on the Dashboard).
          Every field rendered here (productName, quantity, unit,
          sellingPrice) was already stored on StockCountItem before this
          feature — nothing new is written or computed; this only makes
          already-correct data visible. Selling Value is the headline
          figure per §9b of the accepted §44 amendment
          (business-worth-evolution-periodic-contagem-cost-price-removal-amendment.md)
          — cost is not shown here, consistent with that amendment's
          "friction disproportionate to value" finding for Periodic
          Contagem cost figures generally. */}
      {viewingCount && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setViewingCount(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[85vh] flex flex-col shadow-[0_24px_64px_-16px_rgba(11,31,58,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-[#F0EEE4]">
              <div className="min-w-0">
                <h3 className="type-title text-[#111827] truncate">
                  {viewingCount.label || TYPE_LABELS[viewingCount.type]}
                </h3>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  {formatDate(viewingCount.date)} · {viewingCount.items.length} produtos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingCount(null)}
                aria-label="Fechar"
                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-3 space-y-1">
              {viewingCount.items.length === 0 ? (
                <p className="text-[13px] text-gray-500 py-6 text-center">Nenhum produto registado nesta contagem.</p>
              ) : (
                viewingCount.items.map((item, idx) => (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F6F5F0] last:border-b-0"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-gray-300 shrink-0" strokeWidth={2} />
                      <p className="text-[13px] font-semibold text-[#111827] truncate">{item.productName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="type-number text-[13px] text-[#111827] tabular-nums block">
                        {item.quantity} {item.unit || 'un'}
                      </span>
                      {typeof item.sellingPrice === 'number' && (
                        <span className="text-[12px] text-gray-500 tabular-nums block">
                          {formatCurrency(item.quantity * item.sellingPrice, currencySymbol)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 sm:px-6 py-4 border-t border-[#F0EEE4] flex items-center justify-between">
              <span className="text-[13px] font-semibold text-gray-500">Valor de Venda Total</span>
              {/* [Bug fix — genuinely absent, never a fabricated zero,
                  matching this codebase's own established FR-69
                  discipline] A count recorded before the Selling Price
                  on Stock Counts feature existed has no
                  totalSellingValue at all — `?? 0` would render an
                  indistinguishable-from-real "€0", which could be
                  mistaken for a genuine zero-value count rather than a
                  figure this historical record was never asked to
                  track. */}
              {typeof viewingCount.totalSellingValue === 'number' ? (
                <span className="type-number text-base font-bold text-[#111827] tabular-nums">
                  {formatCurrency(viewingCount.totalSellingValue, currencySymbol)}
                </span>
              ) : (
                <span className="text-[12px] text-gray-400 italic">
                  Não disponível para esta contagem (registada antes desta funcionalidade existir)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
