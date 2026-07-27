import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
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
  const { t } = useLanguage();
  const visibleTabs = isStaff ? NAV_TABS.filter(tab => !tab.ownerOnly) : NAV_TABS;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0B1F3A] z-40 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_-8px_28px_-6px_rgba(10,28,56,0.35)] border-t border-white/[0.06]">
      <div className="flex items-center justify-around overflow-x-auto">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[52px] py-1.5 px-1 rounded-xl text-[10px] font-bold tracking-tight transition-all duration-150 active:scale-95 ${
                isActive ? 'text-[#D4AF37]' : 'text-white/55 hover:text-white/85'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors duration-150 ${isActive ? 'bg-[#D4AF37]/15' : ''}`}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.25 : 2} />
              </div>
              <span className="mt-0.5">{t(tab.shortLabelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
