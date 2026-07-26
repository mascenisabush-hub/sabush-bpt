import React, { useState } from 'react';
import { TopNavbar, NavSection } from './TopNavbar';
import { SummaryCards } from './SummaryCards';
import { ProfitLineChart } from './ProfitLineChart';
import { InventoryDonut } from './InventoryDonut';
import { RecentBatchesTable } from './RecentBatchesTable';
import { ActivityTimeline } from './ActivityTimeline';
import { AlertsPanel } from './AlertsPanel';
import { QuickActions } from './QuickActions';

interface NewSaaSDashboardProps {
  onExit?: () => void;
}

export const NewSaaSDashboard: React.FC<NewSaaSDashboardProps> = ({ onExit }) => {
  const [section, setSection] = useState<NavSection>('Dashboard');

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans antialiased">
      <TopNavbar activeSection={section} onSelectSection={setSection} />

      {onExit && (
        <div className="px-4 sm:px-6 lg:px-8 pt-3">
          <button
            onClick={onExit}
            className="text-xs font-semibold text-gray-400 hover:text-[#1B3966] transition-colors"
          >
            ← Voltar à app principal
          </button>
        </div>
      )}

      {/* Inventory/Reports never render here — TopNavbar navigates away
          from this view the instant either is selected (see TopNavbar's
          handleSelect), so this is always the Dashboard section. */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <SummaryCards />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProfitLineChart />
          </div>
          <div>
            <InventoryDonut />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentBatchesTable />
          </div>
          <div>
            <ActivityTimeline />
          </div>
        </div>

        <AlertsPanel />
        <QuickActions />
      </main>
    </div>
  );
};
