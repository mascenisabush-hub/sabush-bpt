import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { BookOpen, Plus, X, CheckCircle2, Search, Pencil } from 'lucide-react';
import { sanitizeDecimalInput } from '../lib/decimalInputSanitizer';
import { findSimilarProducts } from '../lib/productNameSimilarity';
import { EditProductModal } from './EditProductModal';
import { formatCurrency } from '../utils/formatters';
import { Product } from '../types';
import type { UnitRelationshipProposal } from '../lib/unitRelationship';

// [Owner Product Catalog — Phase 1, Checkpoint E — Implementation
// Authorization §3.2] Catalog list/search + Edit wiring, per the
// Implementation Plan's own literal Checkpoint E definition:
// "registered products appear in the list; search/filter works;
// 'Edit' opens the existing, unmodified EditProductModal." Reuses
// DashboardView.tsx's own existing multi-field search-matching shape
// (name/sku/barcode/category/supplier, `active !== false`) — never a
// second, competing filter rule — and imports EditProductModal
// completely unmodified, exactly as Dashboard already does, for the
// exact same "no duplicate edit UI/logic" invariant this checkpoint
// protects.
//
// Deliberately NOT stock-based: this list's own membership criterion
// is `active !== false` and the search query alone, matching
// DashboardView's own convention precisely — a Product with zero
// stock, no StockBatch, and no StockCount still appears here, exactly
// as Checkpoint D's own registration flow already produces such a
// Product and this checkpoint must not hide it.
//
// Checkpoints A–D's own form/registration/resolution logic below is
// completely unmodified by this checkpoint — only the section after
// the form (previously an unconditional empty state) is replaced with
// the actual list.
export const ProductCatalogView: React.FC = () => {
  const { t } = useLanguage();
  const { products, registerCatalogProduct, currencySymbol } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [sellingPriceError, setSellingPriceError] = useState<string | null>(null);

  // [Product Catalog Phase 2 — Checkpoint 2, Specification §6] New —
  // the optional unit-relationship capture UI's own state. `unitRows[0]`
  // is the top-level/default unit (its own factorFromPrevious is
  // unused/ignored, per isValidUnitRelationship); each subsequent row
  // adds one more level to the chain, with its own factor relative to
  // the previous level — supporting the "full chain" Specification §6
  // requires, not merely a single unit. Kept as strings in state
  // (sanitizeDecimalInput'd on change) matching this codebase's
  // existing decimal-input convention (see sellingPrice, above) rather
  // than storing raw numbers directly.
  const [unitRows, setUnitRows] = useState<{ unit: string; factorFromPrevious: string }[]>([{ unit: '', factorFromPrevious: '1' }]);
  const [sellingUnit, setSellingUnit] = useState('');
  const [unitRelationshipError, setUnitRelationshipError] = useState<string | null>(null);
  const [sellingUnitError, setSellingUnitError] = useState<string | null>(null);

  // [Checkpoint D] Non-empty only while an unresolved near-duplicate
  // name is awaiting explicit Owner resolution — the exact invariant
  // this checkpoint protects: a near-duplicate name may never reach
  // `registerCatalogProduct` while this is non-empty.
  const [candidates, setCandidates] = useState<{ id: string; name: string; score: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // [Checkpoint E] List/search + edit wiring's own state.
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const resetForm = () => {
    setName('');
    setSellingPrice('');
    setCategory('');
    setSupplier('');
    setSku('');
    setBarcode('');
    setNameError(null);
    setSellingPriceError(null);
    setUnitRows([{ unit: '', factorFromPrevious: '1' }]);
    setSellingUnit('');
    setUnitRelationshipError(null);
    setSellingUnitError(null);
    setCandidates([]);
    setSubmitError(null);
  };

  // [Checkpoint E] Reuses DashboardView.tsx's own existing multi-field
  // match shape exactly (name/sku/barcode/category/supplier,
  // case-insensitive `includes`) and its own `active !== false`
  // convention — never a second, competing filter rule. Deliberately
  // NOT filtered by stock/batch/count history of any kind — a
  // registered, zero-stock Product must appear here exactly like any
  // other.
  const filteredCatalogProducts = products.filter((p) => {
    if (p.active === false) return false;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      p.name.toLowerCase().includes(query) ||
      (p.sku || '').toLowerCase().includes(query) ||
      (p.barcode || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query) ||
      (p.supplier || '').toLowerCase().includes(query)
    );
  });

  // [Product Catalog Phase 2 — Checkpoint 2, Specification §6] Builds
  // the unit-relationship candidate from unitRows/sellingUnit, or
  // undefined if no unit was ever entered — a Product may legitimately
  // have no unit relationship at all (Specification §10). Mirrors
  // registerCatalogProduct's/confirmUnitRelationship's own shape
  // exactly (units[] + optional sellingUnit) so the payload this
  // builds is validated the identical way server-side, never a
  // different or looser client-side shape.
  const buildUnitRelationshipPayload = (): UnitRelationshipProposal | undefined => {
    const filled = unitRows.filter((r) => r.unit.trim());
    if (filled.length === 0) return undefined;
    return {
      units: filled.map((r, i) => ({
        unit: r.unit.trim(),
        factorFromPrevious: i === 0 ? 1 : parseFloat(r.factorFromPrevious),
      })),
      ...(sellingUnit.trim() ? { sellingUnit: sellingUnit.trim() } : {}),
    };
  };

  // [Checkpoint C — validation] [Product Catalog Phase 2 — Checkpoint 2,
  // Specification §6/§10, Implementation Plan Amendment §C] `sellingPrice`
  // is now OPTIONAL — reuses the exact same finite/non-negative
  // convention `registerCatalogProduct` itself already enforces
  // server-side (Checkpoint B) only when a price was actually entered,
  // never a different or stricter client-side rule. When a price IS
  // entered, a valid selling unit (a member of the entered chain) is
  // now also required — the same sellingPrice/sellingUnit pairing
  // invariant `registerCatalogProduct` enforces server-side,
  // surfaced here as a clear field-level error before any write is
  // attempted, matching this checkpoint's own validation-before-write
  // discipline (Plan §L).
  const validate = (): boolean => {
    let valid = true;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t('productCatalog.form.nameRequiredError'));
      valid = false;
    } else {
      setNameError(null);
    }

    const filledUnitRows = unitRows.filter((r) => r.unit.trim());
    let unitFactorsValid = true;
    for (let i = 1; i < filledUnitRows.length; i++) {
      const factor = parseFloat(filledUnitRows[i].factorFromPrevious);
      if (!Number.isFinite(factor) || factor <= 0) {
        unitFactorsValid = false;
        break;
      }
    }
    if (!unitFactorsValid) {
      setUnitRelationshipError(t('productCatalog.form.unitFactorInvalidError'));
      valid = false;
    } else {
      setUnitRelationshipError(null);
    }

    const trimmedPrice = sellingPrice.trim();
    if (trimmedPrice !== '') {
      const parsedPrice = parseFloat(trimmedPrice);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        setSellingPriceError(t('productCatalog.form.sellingPriceInvalidError'));
        valid = false;
      } else {
        setSellingPriceError(null);
      }

      // [Specification §10/§16] A supplied sellingPrice must arrive
      // alongside a valid sellingUnit — a member of the entered chain
      // — or registration must be blocked before it ever reaches
      // registerCatalogProduct.
      if (unitFactorsValid) {
        const isMember = filledUnitRows.some((r) => r.unit.trim().toLowerCase() === sellingUnit.trim().toLowerCase());
        if (!sellingUnit.trim() || !isMember) {
          setSellingUnitError(t('productCatalog.form.sellingUnitRequiredError'));
          valid = false;
        } else {
          setSellingUnitError(null);
        }
      }
    } else {
      setSellingPriceError(null);
      setSellingUnitError(null);
    }

    return valid;
  };

  // [Product Catalog Phase 2 — Checkpoint 2, Specification §6/§10]
  // sellingPrice/unitRelationship are now conditionally included —
  // never sent as an invalid/empty value, matching registerCatalogProduct's
  // own optional-field conventions.
  const buildPayload = () => ({
    name: name.trim(),
    ...(sellingPrice.trim() !== '' ? { sellingPrice: parseFloat(sellingPrice) } : {}),
    ...(buildUnitRelationshipPayload() ? { unitRelationship: buildUnitRelationshipPayload() } : {}),
    ...(category.trim() ? { category: category.trim() } : {}),
    ...(supplier.trim() ? { supplier: supplier.trim() } : {}),
    ...(sku.trim() ? { sku: sku.trim() } : {}),
    ...(barcode.trim() ? { barcode: barcode.trim() } : {}),
  });

  // [Checkpoint D stop condition — Implementation Plan's own words]
  // "a near-duplicate name cannot reach creation without explicit
  // Owner confirmation." Field validation (Checkpoint C, unchanged)
  // runs first; only once it passes does this checkpoint's own
  // recognition step run. If findSimilarProducts finds nothing, the
  // Owner's own submit click is itself the explicit, unambiguous
  // confirmation — nothing to disambiguate, matching the same
  // no-extra-click convention AddStockView's own exact-match path
  // already uses. If candidates are found, creation is blocked here
  // and the resolution UI (below) takes over; only
  // `handleConfirmNew` may proceed to the write path from that point.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (isSubmitting) return;

    const trimmedName = name.trim();
    const found = findSimilarProducts(trimmedName, products);
    if (found.length > 0) {
      setCandidates(found);
      return;
    }

    await submitRegistration(true);
  };

  // [Checkpoint D] The one and only path that reaches
  // registerCatalogProduct — reused, unmodified, exactly as
  // implemented in Checkpoint B. confirmedNewProduct is always
  // explicitly true here: either the Owner never saw a candidate
  // (nothing to confirm beyond their own submit) or they explicitly
  // clicked "Confirmar como produto novo" after reviewing candidates.
  // registerCatalogProduct's own Checkpoint B safety boundary is
  // still fully in force underneath this — an exact-name match is
  // still caught and resolved to the existing product's id by that
  // function itself, never bypassed, never weakened, never
  // duplicated here.
  const submitRegistration = async (confirmedNewProduct: boolean) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await registerCatalogProduct({ ...buildPayload(), confirmedNewProduct });
      setSuccessMessage(t('productCatalog.form.successMessage'));
      setShowForm(false);
      resetForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('productCatalog.form.genericError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmNew = () => {
    void submitRegistration(true);
  };

  // [Checkpoint D] The Owner explicitly identifies the submitted name
  // as an already-known product. No Product is created — the write
  // path is never called on this branch at all, since there is
  // nothing new to register; this is the correct behaviour for "use
  // the existing identity" per Requirement 1 (unresolved identity
  // must never silently create a Product) applied in the direction
  // that also means a *resolved-as-existing* identity must never
  // create one either.
  const handleUseExisting = () => {
    setSuccessMessage(t('productCatalog.form.existingResolvedMessage'));
    setShowForm(false);
    resetForm();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-[0_1px_2px_rgba(11,31,58,0.04),0_8px_24px_-14px_rgba(11,31,58,0.1)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
            <BookOpen className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <h1 className="type-title-lg flex items-center gap-2">{t('productCatalog.title')}</h1>
            <p className="text-[12px] text-gray-500 mt-0.5">{t('productCatalog.subtitle')}</p>
          </div>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setSuccessMessage(null);
            }}
            className="btn-primary py-2 px-4 text-sm shrink-0"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span>{t('productCatalog.addProductButton')}</span>
          </button>
        )}
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" strokeWidth={2} />
          <p>{successMessage}</p>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3.5 shadow-[0_1px_2px_rgba(11,31,58,0.04),0_8px_24px_-14px_rgba(11,31,58,0.1)]"
        >
          <div className="flex items-center justify-between">
            <h2 className="type-title flex items-center gap-2">{t('productCatalog.form.title')}</h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-500 hover:text-gray-900 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">
              {t('productCatalog.form.nameLabel')} <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full bg-white border rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-60 ${
                nameError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : 'border-[#E5E7EB] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20'
              }`}
            />
            {nameError && <p className="text-[12px] text-rose-600 mt-1">{nameError}</p>}
          </div>

          <div>
            <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">
              {t('productCatalog.form.sellingPriceLabel')}
            </label>
            <input
              type="text"
              inputMode="decimal"
              disabled={isSubmitting}
              value={sellingPrice}
              onChange={(e) => setSellingPrice(sanitizeDecimalInput(e.target.value))}
              className={`w-full bg-white border rounded-[10px] px-3 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-60 ${
                sellingPriceError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : 'border-[#E5E7EB] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20'
              }`}
            />
            {sellingPriceError && <p className="text-[12px] text-rose-600 mt-1">{sellingPriceError}</p>}
          </div>

          {/* [Product Catalog Phase 2 — Checkpoint 2, Specification §6]
              Optional unit-relationship capture — a chain of one or
              more units, each level's factor relative to the previous
              one, plus a selling-unit selector scoped to whichever
              units have actually been entered. Entirely optional: a
              Product may be registered with no relationship at all
              (Specification §10). Required only when sellingPrice is
              supplied (validate(), above). */}
          <div className="space-y-2">
            <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">{t('productCatalog.form.unitRelationshipLabel')}</label>
            {unitRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={row.unit}
                  onChange={(e) => {
                    const next = [...unitRows];
                    next[idx] = { ...next[idx], unit: e.target.value };
                    setUnitRows(next);
                  }}
                  placeholder={idx === 0 ? t('productCatalog.form.unitTopLevelPlaceholder') : t('productCatalog.form.unitLevelPlaceholder')}
                  className="flex-1 bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-60"
                />
                {idx > 0 && (
                  <>
                    <span className="text-[12px] text-gray-400 shrink-0">=</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={isSubmitting}
                      value={row.factorFromPrevious}
                      onChange={(e) => {
                        const next = [...unitRows];
                        next[idx] = { ...next[idx], factorFromPrevious: sanitizeDecimalInput(e.target.value) };
                        setUnitRows(next);
                      }}
                      placeholder="1"
                      className="w-16 bg-white border border-[#E5E7EB] rounded-[10px] px-2 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setUnitRows(unitRows.filter((_, i) => i !== idx))}
                      className="p-1.5 text-gray-400 hover:text-rose-600 transition shrink-0 disabled:opacity-60"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setUnitRows([...unitRows, { unit: '', factorFromPrevious: '1' }])}
              className="text-[12px] font-semibold text-[#0B1F3A] hover:underline disabled:opacity-60"
            >
              + {t('productCatalog.form.addUnitLevelButton')}
            </button>
            {unitRelationshipError && <p className="text-[12px] text-rose-600 mt-1">{unitRelationshipError}</p>}

            {unitRows.some((r) => r.unit.trim()) && (
              <div>
                <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1 mt-2">{t('productCatalog.form.sellingUnitLabel')}</label>
                <select
                  disabled={isSubmitting}
                  value={sellingUnit}
                  onChange={(e) => setSellingUnit(e.target.value)}
                  className={`w-full bg-white border rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-60 ${
                    sellingUnitError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : 'border-[#E5E7EB] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20'
                  }`}
                >
                  <option value="">{t('productCatalog.form.sellingUnitPlaceholder')}</option>
                  {unitRows
                    .filter((r) => r.unit.trim())
                    .map((r) => (
                      <option key={r.unit} value={r.unit.trim()}>
                        {r.unit.trim()}
                      </option>
                    ))}
                </select>
                {sellingUnitError && <p className="text-[12px] text-rose-600 mt-1">{sellingUnitError}</p>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">{t('productCatalog.form.categoryLabel')}</label>
              <input
                type="text"
                disabled={isSubmitting}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">{t('productCatalog.form.supplierLabel')}</label>
              <input
                type="text"
                disabled={isSubmitting}
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">{t('productCatalog.form.skuLabel')}</label>
              <input
                type="text"
                disabled={isSubmitting}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">{t('productCatalog.form.barcodeLabel')}</label>
              <input
                type="text"
                disabled={isSubmitting}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-60"
              />
            </div>
          </div>

          {/* [Checkpoint D — identity resolution sub-UI] Rendered only
              while `candidates` is non-empty — i.e. only between a
              submit that found near-duplicates and the Owner's own
              explicit resolution. Creation is blocked for the entire
              time this is visible; see handleSubmit's own comment for
              why. */}
          {candidates.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
              <p className="text-[13px] text-amber-900">{t('productCatalog.form.similarProductsFound')}</p>
              <ul className="space-y-1.5">
                {candidates.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-900 font-medium">{c.name}</span>
                    <button
                      type="button"
                      onClick={handleUseExisting}
                      className="text-[12px] font-semibold text-amber-700 hover:text-amber-900 transition shrink-0"
                    >
                      {t('productCatalog.form.useExistingButton')}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleConfirmNew}
                disabled={isSubmitting}
                className="btn-secondary py-1.5 px-3 text-[12px] disabled:opacity-60"
              >
                <span>{t('productCatalog.form.confirmNewButton')}</span>
              </button>
            </div>
          )}

          {submitError && <p className="text-[12px] text-rose-600">{submitError}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="btn-secondary py-2 px-4 text-sm"
            >
              <span>{t('productCatalog.form.cancelButton')}</span>
            </button>
            <button type="submit" disabled={isSubmitting || candidates.length > 0} className="btn-primary py-2 px-4 text-sm disabled:opacity-60">
              <span>{t('productCatalog.form.submitButton')}</span>
            </button>
          </div>
        </form>
      )}

      {/* [Checkpoint E] Search — reuses DashboardView's own field-match
          shape (see filteredCatalogProducts, above), never a second
          rule. Always rendered once at least one Product exists, even
          if the current query matches none, so the Owner can clear
          the search and see the list again. */}
      {products.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('productCatalog.searchPlaceholder')}
            className="w-full bg-white border border-[#E5E7EB] rounded-[10px] pl-9 pr-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
          />
        </div>
      )}

      {/* [Checkpoint E] Three states, in order: no Products registered
          at all (Checkpoint A/C's own original empty state, unchanged
          wording); Products exist but this search matches none; the
          actual list. A registered, zero-stock Product (Checkpoint
          D's own typical output) is not a fourth state — it renders
          in the same list row as any other Product, per this
          checkpoint's own "not an inventory screen" invariant. */}
      {products.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center">
          <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" strokeWidth={1.75} />
          <p className="text-sm text-gray-500">{t('productCatalog.emptyState')}</p>
        </div>
      ) : filteredCatalogProducts.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" strokeWidth={1.75} />
          <p className="text-sm text-gray-500">{t('productCatalog.noSearchResults')}</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl divide-y divide-[#E5E7EB]">
          {filteredCatalogProducts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[12px] text-gray-500">
                  {p.sellingPrice != null && <span className="font-mono">{formatCurrency(p.sellingPrice, currencySymbol)}</span>}
                  {p.category && <span>{p.category}</span>}
                  {p.supplier && <span>{p.supplier}</span>}
                  {p.sku && <span className="font-mono">SKU: {p.sku}</span>}
                  {p.barcode && <span className="font-mono">{p.barcode}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(p)}
                className="btn-secondary py-1.5 px-3 text-[12px] shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                <span>{t('productCatalog.editButton')}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* [Checkpoint E — Invariant: no duplicate UI/logic for editing]
          EditProductModal, imported completely unmodified above,
          exactly as DashboardView.tsx already uses it — same props,
          same behavior, same existing governance boundary (per its
          own header comment: catalog metadata editable; the purchase
          cost field stays read-only there; never touches a
          StockBatch). Editing here updates the SAME canonical Product
          document this Catalog list itself reads from — never a
          second Product, never a parallel edit path. */}
      {editingProduct && <EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)} />}
    </div>
  );
};
