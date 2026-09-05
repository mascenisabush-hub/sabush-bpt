import React from 'react';
import { formatCurrency } from '../utils/formatters';
import { SubscriptionBlockedNotice } from './SubscriptionBlockedNotice';
import { FileDown, Lock } from 'lucide-react';

// [Decision 41E — Subscription-Blocked Draft Access / Read-Only
// Recovery; Implementation Plan §9] A deliberately narrow, PURELY
// PRESENTATIONAL component: props in, JSX out, nothing else. It owns
// no Firestore access, no draft-save/flush/finalize functions, no
// `useApp()` call, and no local state beyond a trivial UI-only toggle
// if one is ever added — by construction, this component cannot
// itself create, update, delete, autosave, or finalize anything. Every
// field it renders is read-only text; there is exactly one possible
// interactive control (`onExportPdf`, when provided by the caller),
// and export is a client-side PDF generation, never a Firestore write
// (see reportExport.ts's own exportReportPdf — no `setDoc`/`updateDoc`
// call anywhere in that module).
//
// This is the "minimum read-only presentation necessary to preserve
// access to the existing saved information" the signed Implementation
// Plan calls for (§10) — deliberately NOT a re-skinned version of
// either view's own rich, stateful editing UI (which would require
// auditing dozens of onChange handlers/effects for write-safety);
// instead it is a fresh, minimal read surface with no editable inputs
// at all, so there is no write path to audit here in the first place.
//
// Used identically by both PeriodicStockCountView.tsx and
// InitialStockCountView.tsx while `subscriptionBlocksNewRecords` is
// true and a real draft exists for the current business — see each
// view's own render-gate comment for how the caller decides whether to
// mount this component at all.

export interface ReadOnlyDraftRow {
  productName: string;
  quantity: string;
  unit?: string;
  costPrice?: string;
  sellingPrice?: string;
}

export interface ReadOnlyDraftRecoveryProps {
  /** Screen-specific heading, e.g. "Contagem Periódica por Terminar". */
  title: string;
  /** One-line summary of the draft's own identity — date/type/label, or date alone. */
  subtitle: string;
  /** Snapshot of the draft's own rows, already formatted as display strings — never live/editable state. */
  rows: ReadOnlyDraftRow[];
  currencySymbol: string;
  /**
   * When provided, renders an "Exportar PDF" button that calls this
   * function on click. Omit entirely (rather than passing a no-op) for
   * a screen with no existing export mechanism to reuse — see each
   * caller's own comment for which screens currently have one.
   */
  onExportPdf?: () => void;
  /**
   * [Bug fix — silent PDF download failure] When set (non-null), shown
   * as an inline error banner near the export button — the caller is
   * responsible for catching exportReportPdf's own rejection and
   * passing the resulting message here; this component itself performs
   * no export logic and has no way to detect a failure on its own.
   */
  exportPdfError?: string | null;
}

// [Decision 41E §5/§6] One shared component covers both Periodic
// Contagem and Initial Stock — the two screens' draft shapes differ
// (PeriodicStockDraftItem vs InitialStockDraftItem), so each caller
// normalizes its own draft's `items` into this one common `rows` shape
// before rendering, rather than this component knowing about either
// screen's own richer type.
export const ReadOnlyDraftRecovery: React.FC<ReadOnlyDraftRecoveryProps> = ({
  title,
  subtitle,
  rows,
  currencySymbol,
  onExportPdf,
  exportPdfError,
}) => {
  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6">
      {/* [§1/§10] The existing, unmodified subscription-blocked
          messaging (upgrade CTA, contact modal) — reused verbatim so
          the Owner still sees the SAME explanation of why they're
          blocked, now with their existing draft visible underneath it
          rather than instead of it. */}
      <SubscriptionBlockedNotice />

      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-16px_rgba(11,31,58,0.12)] p-5 sm:p-8 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B1F3A]/[0.06] flex items-center justify-center text-[#0B1F3A] shrink-0">
              <Lock className="w-4 h-4" strokeWidth={2.25} />
            </div>
            <div>
              <h2 className="type-title">{title}</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="btn-secondary flex items-center gap-1.5 px-4 py-2 text-sm shrink-0"
            >
              <FileDown className="w-4 h-4" strokeWidth={2.25} />
              <span>Exportar PDF</span>
            </button>
          )}
        </div>

        {exportPdfError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-rose-700">
            {exportPdfError}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-800">
          Está a ver os dados já guardados deste rascunho. Enquanto a subscrição estiver bloqueada, não é possível
          editar, guardar novas alterações ou terminar esta contagem — apenas consultar e exportar o que já foi
          guardado.
        </div>

        {rows.length === 0 ? (
          <p className="text-[13px] text-gray-500 py-4 text-center">Este rascunho ainda não tem nenhum produto guardado.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-left text-gray-500">
                  <th className="py-2 px-3 font-semibold">Produto</th>
                  <th className="py-2 px-3 font-semibold">Qtd</th>
                  <th className="py-2 px-3 font-semibold">Unid</th>
                  <th className="py-2 px-3 font-semibold text-right">Custo</th>
                  <th className="py-2 px-3 font-semibold text-right">Venda</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-b border-[#F3F4F6] last:border-0">
                    <td className="py-2 px-3 font-medium text-[#0B1F3A]">{row.productName || '—'}</td>
                    <td className="py-2 px-3 tabular-nums">{row.quantity || '—'}</td>
                    <td className="py-2 px-3">{row.unit || '—'}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {row.costPrice ? formatCurrency(parseFloat(row.costPrice) || 0, currencySymbol) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {row.sellingPrice ? formatCurrency(parseFloat(row.sellingPrice) || 0, currencySymbol) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
