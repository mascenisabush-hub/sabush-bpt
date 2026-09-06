import React from 'react';
import { X, Download } from 'lucide-react';

// [Owner-requested — preview before download] A deliberately narrow,
// purely presentational modal: props in, JSX out, nothing else. It
// owns no PDF-generation logic, no Firestore access, no useApp() call
// — the caller is responsible for calling reportExport.ts's
// generateReportPdfPreview to obtain the blobUrl/fileName/download/
// revoke it's handed here, and for calling revoke() once this modal
// closes (this component has no way to know when the caller is truly
// done with the underlying blob, so it never revokes on the caller's
// behalf).
//
// Renders the exact same PDF document the "Download" button inside it
// will save — the blob URL IS the already-built document
// (reportExport.ts's shared buildReportPdfDocument), never a second,
// independently-rendered preview that could drift from what actually
// gets downloaded.

export interface PdfPreviewModalProps {
  /** Shown in the modal header — typically the report's own title. */
  title: string;
  /** A blob: URL pointing at the already-built PDF (see generateReportPdfPreview). */
  blobUrl: string;
  /** Called when the operator clicks "Descarregar" — triggers the actual file save. Does not close the modal. */
  onDownload: () => void;
  /** Called on backdrop click or the close button — the caller closes the modal AND revokes the blob URL. */
  onClose: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ title, blobUrl, onDownload, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-3xl h-[92vh] sm:h-[85vh] flex flex-col shadow-[0_24px_64px_-16px_rgba(11,31,58,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-[#F0EEE4]">
          <h3 className="type-title text-[#111827] truncate">{title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onDownload}
              className="btn-primary py-2 px-3.5 text-[13px] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span className="hidden sm:inline">Descarregar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="p-1.5 rounded-lg text-gray-400 hover:text-[#0B1F3A] hover:bg-gray-50 transition-colors duration-150"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-gray-100 rounded-b-3xl sm:rounded-b-3xl overflow-hidden">
          <iframe src={blobUrl} title={title} className="w-full h-full border-0" />
        </div>
      </div>
    </div>
  );
};
