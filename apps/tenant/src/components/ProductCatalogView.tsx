import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { BookOpen, Plus, X, CheckCircle2 } from 'lucide-react';
import { sanitizeDecimalInput } from '../lib/decimalInputSanitizer';
import { findSimilarProducts } from '../lib/productNameSimilarity';

// [Owner Product Catalog — Phase 1, Checkpoint D — Implementation
// Authorization §3.2] Identity resolution + registration write
// integration, per the Implementation Plan's own literal Checkpoint D
// definition: "submitting the form now runs recognition first; only
// a confirmed-new path reaches registerCatalogProduct." Reuses only
// the existing, pure candidate-generation logic (`findSimilarProducts`,
// unmodified, imported exactly as AddStockView.tsx and
// PeriodicStockCountView.tsx already import it) — this file's own
// candidate-list/confirm UI below is new, Catalog-specific rendering
// of that same governed resolution flow, never a second recognition
// algorithm and never an import of either host's own UI.
//
// Checkpoint C's own form (fields, base validation, styling) is
// unmodified below except for the removal of its now-factually-
// outdated "not yet available" note — the write path this checkpoint
// wires in makes that note false, not this checkpoint changing
// Checkpoint C's own decisions.
//
// Still absent from this checkpoint, exactly as before:
//   - loading/searching/filtering the business's existing catalog list
//     for browsing purposes (Checkpoint E — this file still has no
//     product list, only the identity-resolution candidates surfaced
//     during registration itself);
//   - every other capability this whole Phase excludes by its own
//     accepted scope (a second identity model, configuring how units
//     convert for a product, combining two existing product records,
//     or a stock-history status indicator).
export const ProductCatalogView: React.FC = () => {
  const { t } = useLanguage();
  const { products, registerCatalogProduct } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [sellingPriceError, setSellingPriceError] = useState<string | null>(null);

  // [Checkpoint D] Non-empty only while an unresolved near-duplicate
  // name is awaiting explicit Owner resolution — the exact invariant
  // this checkpoint protects: a near-duplicate name may never reach
  // `registerCatalogProduct` while this is non-empty.
  const [candidates, setCandidates] = useState<{ id: string; name: string; score: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setSellingPrice('');
    setCategory('');
    setSupplier('');
    setSku('');
    setBarcode('');
    setNameError(null);
    setSellingPriceError(null);
    setCandidates([]);
    setSubmitError(null);
  };

  // [Checkpoint C — validation, unmodified] Reuses the exact same
  // finite/non-negative convention `registerCatalogProduct` itself
  // already enforces server-side (Checkpoint B) — never a different
  // or stricter client-side rule.
  const validate = (): boolean => {
    let valid = true;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t('productCatalog.form.nameRequiredError'));
      valid = false;
    } else {
      setNameError(null);
    }

    const parsedPrice = parseFloat(sellingPrice);
    if (sellingPrice.trim() === '' || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setSellingPriceError(t('productCatalog.form.sellingPriceRequiredError'));
      valid = false;
    } else {
      setSellingPriceError(null);
    }

    return valid;
  };

  const buildPayload = () => ({
    name: name.trim(),
    sellingPrice: parseFloat(sellingPrice),
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
              {t('productCatalog.form.sellingPriceLabel')} <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              disabled={isSubmitting}
              value={sellingPrice}
              onChange={(e) => setSellingPrice(sanitizeDecimalInput(e.target.value))}
              className={`w-full bg-white border rounded-[10px] px-3 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-60 ${
                sellingPriceError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : 'border-[#E5E7EB] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20'
              }`}
            />
            {sellingPriceError && <p className="text-[12px] text-rose-600 mt-1">{sellingPriceError}</p>}
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

      {/* [Checkpoint A/C] No catalog list/search exists yet — this
          empty state is unconditional, not the result of a filtered/
          loaded-but-empty dataset. Styling mirrors StocksView's own
          existing empty-state pattern exactly, for visual consistency
          with the rest of the app. */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center">
        <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" strokeWidth={1.75} />
        <p className="text-sm text-gray-500">{t('productCatalog.emptyState')}</p>
      </div>
    </div>
  );
};
