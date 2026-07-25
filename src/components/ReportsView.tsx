import React, { useState } from 'react';
import { ReportKey } from './reports/shared/reportTypes';
import { ReportHome } from './reports/ReportHome';
import { BusinessWorthReport } from './reports/BusinessWorthReport';
import { InventoryValuationReport } from './reports/InventoryValuationReport';
import { BatchPerformanceReport } from './reports/BatchPerformanceReport';
import { CapitalGrowthReport } from './reports/CapitalGrowthReport';
import { ExpenseReport } from './reports/ExpenseReport';
import { WithdrawalReport } from './reports/WithdrawalReport';
import { InventoryLossReport } from './reports/InventoryLossReport';
import { StockVerificationReport } from './reports/StockVerificationReport';

// ============================================================
// REPORTS — Business Intelligence Center.
// ============================================================
// This is the analytical layer of Sabush: it never recalculates
// business figures on its own. Every number shown here is produced
// by the existing, untouched calculation engine
// (utils/calculations.ts and utils/purchaseBatchCalculations.ts) or
// read straight from AppContext's already-computed totals. This file
// and everything under ./reports only decides how to filter, group,
// visualize, narrate and export those numbers.
// ============================================================
export const ReportsView: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportKey | null>(null);

  const handleBack = () => setActiveReport(null);

  return (
    <>
      {/* Print styles: only the active report's content is printed —
          Header/NavigationTabs and all interactive controls are hidden. */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .report-print-area, .report-print-area * { visibility: visible; }
          .report-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          .report-no-print { display: none !important; }
          .report-print-only { display: inline !important; }
        }
      `}</style>

      {activeReport === null && <ReportHome onSelect={setActiveReport} />}
      {activeReport === 'business-worth' && <BusinessWorthReport onBack={handleBack} />}
      {activeReport === 'inventory-valuation' && <InventoryValuationReport onBack={handleBack} />}
      {activeReport === 'batch-performance' && <BatchPerformanceReport onBack={handleBack} />}
      {activeReport === 'capital-growth' && <CapitalGrowthReport onBack={handleBack} />}
      {activeReport === 'expenses' && <ExpenseReport onBack={handleBack} />}
      {activeReport === 'withdrawals' && <WithdrawalReport onBack={handleBack} />}
      {activeReport === 'inventory-losses' && <InventoryLossReport onBack={handleBack} />}
      {activeReport === 'stock-verification' && <StockVerificationReport onBack={handleBack} />}
    </>
  );
};
