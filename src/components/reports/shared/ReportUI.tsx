import React from 'react';
import { formatCurrency } from '../../../utils/formatters';
import { useApp } from '../../../context/AppContext';
import { useLanguage } from '../../../context/LanguageContext';
import { ArrowLeft, Lightbulb, FileDown, Sheet, Printer, ChevronDown, ChevronUp } from 'lucide-react';

// ============================================================
// REPORT KPI CARD — large-number, executive-report styling.
// Purely presentational: every value arrives already computed.
// ============================================================
interface ReportKpiProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative' | 'accent';
  sub?: string;
}

const TONE_CLASSES: Record<string, string> = {
  default: 'text-gray-900',
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
  accent: 'text-blue-600',
};

const TONE_ICON_BG: Record<string, string> = {
  default: 'bg-gray-100 text-gray-600',
  positive: 'bg-emerald-50 text-emerald-600',
  negative: 'bg-rose-50 text-rose-600',
  accent: 'bg-blue-50 text-blue-600',
};

export const ReportKpiCard: React.FC<ReportKpiProps> = ({ icon: Icon, label, value, tone = 'default', sub }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${TONE_ICON_BG[tone]}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 leading-tight">{label}</p>
      <p className={`text-lg sm:text-xl font-extrabold font-mono mt-0.5 leading-tight truncate ${TONE_CLASSES[tone]}`}>
        {value}
      </p>
    </div>
    {sub && <p className="text-[10.5px] text-gray-500 leading-snug">{sub}</p>}
  </div>
);

// ============================================================
// INSIGHT BANNER — auto-generated, plain-language summary line(s)
// derived strictly from the same numbers already shown in the report.
// ============================================================
export const InsightBanner: React.FC<{ insights: string[] }> = ({ insights }) => {
  if (!insights.length) return null;
  return (
    <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl p-4 flex gap-3">
      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
        <Lightbulb className="w-4 h-4" />
      </div>
      <div className="space-y-1">
        {insights.map((line, i) => (
          <p key={i} className="text-xs text-gray-700 leading-relaxed">{line}</p>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// REPORT HEADER — back button, title, description, export actions.
// ============================================================
interface ReportHeaderProps {
  title: string;
  description: string;
  onBack: () => void;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({ title, description, onBack, onExportPdf, onExportExcel, onPrint }) => {
  const { logReportExport } = useApp();
  const { t } = useLanguage();

  const handleExportPdf = onExportPdf
    ? () => {
        logReportExport(title);
        onExportPdf();
      }
    : undefined;

  const handleExportExcel = onExportExcel
    ? () => {
        logReportExport(title);
        onExportExcel();
      }
    : undefined;

  const handlePrint = onPrint
    ? () => {
        logReportExport(title);
        onPrint();
      }
    : undefined;

  return (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 report-no-print">
    <div className="flex items-start gap-3">
      <button
        onClick={onBack}
        className="w-9 h-9 shrink-0 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition shadow-sm"
        title={t('reports.common.backTooltip')}
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>

    {(handleExportPdf || handleExportExcel || handlePrint) && (
      <div className="flex flex-wrap gap-1.5">
        {handleExportPdf && (
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 transition min-h-[36px]"
          >
            <FileDown className="w-3.5 h-3.5" /> {t('reports.common.pdf')}
          </button>
        )}
        {handleExportExcel && (
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 transition min-h-[36px]"
          >
            <Sheet className="w-3.5 h-3.5" /> {t('reports.common.excel')}
          </button>
        )}
        {handlePrint && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 transition min-h-[36px]"
          >
            <Printer className="w-3.5 h-3.5" /> {t('reports.common.print')}
          </button>
        )}
      </div>
    )}
  </div>
  );
};

// ============================================================
// SECTION CARD — consistent white-card wrapper for report sections.
// ============================================================
export const ReportSection: React.FC<{ title?: string; icon?: React.ComponentType<{ className?: string }>; right?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  icon: Icon,
  right,
  children,
}) => (
  <div className="bg-white border border-gray-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
    {title && (
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-blue-600" />}
          {title}
        </h3>
        {right}
      </div>
    )}
    {children}
  </div>
);

// ============================================================
// SORT / GROUP PILL TOGGLE
// ============================================================
export const PillToggle: React.FC<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(opt => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition active:scale-95 ${
          value === opt.value
            ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// ============================================================
// EMPTY STATE
// ============================================================
export const ReportEmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-8 text-gray-500 text-xs bg-gray-50 rounded-2xl border border-gray-200">
    {message}
  </div>
);

// ============================================================
// EXPANDABLE ROW WRAPPER (used by several table-heavy reports)
// ============================================================
export const ExpandChevron: React.FC<{ expanded: boolean }> = ({ expanded }) =>
  expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;

export { formatCurrency };
