import React from 'react';
import { useApp } from '../context/AppContext';
import { NAV_TABS, TabType } from '../data/navigationTabs';

export type { TabType };

interface NavigationTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

// Desktop action row now lives inline inside Header.tsx, on the same line as
// "Meu Negócio" and the profile control. This component only owns the mobile
// fixed bottom bar now — same 11 tabs, same handlers, same source of truth
// (src/data/navigationTabs.ts) as the header row.
export const NavigationTabs: React.FC<NavigationTabsProps> = ({ activeTab, setActiveTab }) => {
  const { isStaff } = useApp();
  const visibleTabs = isStaff ? NAV_TABS.filter(t => !t.ownerOnly) : NAV_TABS;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1B3966] z-40 px-2 py-1.5 shadow-[0_-4px_20px_rgba(10,28,56,0.25)]">
      <div className="flex items-center justify-around overflow-x-auto">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[52px] py-1.5 px-1 rounded-xl text-[10px] font-bold transition active:scale-95 ${
                isActive ? 'text-[#B8791A] font-bold' : 'text-white/60 hover:text-white'
              } italic`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-[#B8791A]/15' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="mt-0.5 tracking-tight">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
