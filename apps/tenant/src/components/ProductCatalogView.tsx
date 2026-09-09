import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { BookOpen, Plus, X } from 'lucide-react';
import { sanitizeDecimalInput } from '../lib/decimalInputSanitizer';

// [Owner Product Catalog — Phase 1, Checkpoint C — Implementation
// Authorization §3.2] Registration FORM + VALIDATION only, per the
// Implementation Plan's own literal Checkpoint C definition:
// "form renders the six fields, validates required fields, does NOT
// yet call registerCatalogProduct (submission is a no-op or logs
// only)." Checkpoint D (a later, separately-authorized checkpoint)
// is what will run identity recognition and actually reach the write
// path this component's own submit handler deliberately does not
// call yet — see `handleSubmit`'s own comment, below, for exactly
// where that boundary sits and why it is not crossed here.
//
// Still absent from this checkpoint, exactly as Checkpoint A already
// was:
//   - loading/searching/filtering the business's catalog (Checkpoint E);
//   - any Firestore write, of any kind (that remains Checkpoint D's
//     own job to trigger, reusing the already-implemented, already-
//     tested registerCatalogProduct from Checkpoint B, unmodified);
//   - product-identity recognition/candidate search (Checkpoint D).
export const ProductCatalogView: React.FC = () => {
  const { t } = useLanguage();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [sellingPriceError, setSellingPriceError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setSellingPrice('');
    setCategory('');
    setSupplier('');
    setSku('');
    setBarcode('');
    setNameError(null);
    setSellingPriceError(null);
  };

  // [Checkpoint C — validation only] Reuses the exact same
  // finite/non-negative convention `registerCatalogProduct` itself
  // already enforces server-side (Checkpoint B) — never a different
  // or stricter client-side rule. This mirroring is deliberate: this
  // form's own validation exists to give the Owner immediate feedback
  // using the same rule the write path will apply once Checkpoint D
  // wires it in, not to invent a second, competing rule.
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

  // [Checkpoint C stop condition — Implementation Plan's own words]
  // "form is fully validated and visually correct before it can write
  // anything." This handler validates and constructs the exact,
  // narrow authorized payload shape (name, sellingPrice, and only the
  // four authorized optional metadata fields — never a purchase cost,
  // never a stock/purchase count, never anything else) — but
  // deliberately stops there. It does NOT call registerCatalogProduct (Checkpoint
  // B's already-implemented, already-tested write path) and does NOT
  // perform any identity-resolution search (Checkpoint D). Both
  // remain for their own, separately-authorized checkpoints; wiring
  // either in here would be implementing ahead of the signed
  // Authorization's own checkpoint boundary.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      sellingPrice: parseFloat(sellingPrice),
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(supplier.trim() ? { supplier: supplier.trim() } : {}),
      ...(sku.trim() ? { sku: sku.trim() } : {}),
      ...(barcode.trim() ? { barcode: barcode.trim() } : {}),
    };
    // eslint-disable-next-line no-console
    console.log('[Product Catalog — Checkpoint C] Form valid. Registration write path (registerCatalogProduct) is wired in Checkpoint D, not here.', payload);
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

        {/* [Checkpoint C] Toggles the registration form below — no
            navigation, no modal, matching this file's own existing
            single-screen shape from Checkpoint A. */}
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary py-2 px-4 text-sm shrink-0"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span>{t('productCatalog.addProductButton')}</span>
          </button>
        )}
      </div>

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
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full bg-white border rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:ring-2 ${
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
              value={sellingPrice}
              onChange={(e) => setSellingPrice(sanitizeDecimalInput(e.target.value))}
              className={`w-full bg-white border rounded-[10px] px-3 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:ring-2 ${
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
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">{t('productCatalog.form.supplierLabel')}</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">{t('productCatalog.form.skuLabel')}</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">{t('productCatalog.form.barcodeLabel')}</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 text-sm text-gray-900 font-mono transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
          </div>

          {/* [Checkpoint C — honest, deliberate transitional state] Per
              the Implementation Plan's own words for this checkpoint,
              submission is "a no-op or logs only" — Checkpoint D is
              what will actually enable saving. This note exists so a
              real Owner encountering this mid-implementation screen is
              never misled into thinking a click here has saved
              anything. */}
          <p className="text-[12px] text-gray-500 italic">{t('productCatalog.form.notYetAvailableNote')}</p>

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
            <button type="submit" className="btn-primary py-2 px-4 text-sm">
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
