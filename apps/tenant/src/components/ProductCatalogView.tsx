import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { BookOpen } from 'lucide-react';

// [Owner Product Catalog — Phase 1, Checkpoint A — Implementation
// Authorization §3.2] This component is deliberately minimal: an
// empty, always-shown placeholder, Owner-only via App.tsx's own
// `!isStaff && activeTab === 'catalog'` gate (mirroring every other
// Owner-only tab's existing pattern — see StocksView's identical
// lack of an internal isStaff re-check). Per this checkpoint's own
// stop condition ("screen renders, gated correctly, before any write
// logic exists"), this file does NOT yet:
//   - load, search, or filter the business's catalog (Checkpoint E);
//   - render a registration form (Checkpoint C);
//   - perform any Firestore write, of any kind (Checkpoint B);
//   - perform product-identity recognition (Checkpoint D).
// Those are later checkpoints, authorized separately; this file must
// not anticipate them.
export const ProductCatalogView: React.FC = () => {
  const { t } = useLanguage();

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
      </div>

      {/* [Checkpoint A only] No catalog list/search exists yet — this
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
