import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NAV_TABS, TabType } from '../data/navigationTabs';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

// ============================================================
// SIDEBAR — persistent left navigation for desktop. Same 11 tabs,
// same handlers, same source of truth (src/data/navigationTabs.ts)
// as the mobile bottom bar and the (now removed) header icon row.
// Purely a new presentational shell — no navigation logic changes.
// ============================================================
export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { isStaff } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const visibleTabs = isStaff ? NAV_TABS.filter(t => !t.ownerOnly) : NAV_TABS;

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-[#0B1F3A] h-screen sticky top-0 transition-all duration-200 ${
        collapsed ? 'w-[76px]' : 'w-[220px]'
      }`}
    >
      {/* Brand mark */}
      <div className={`flex items-center gap-2.5 h-16 shrink-0 ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
        <div className="w-8 h-8 rounded-lg bg-[#D4AF37] flex items-center justify-center shrink-0">
          <span className="text-[#0B1F3A] font-extrabold text-sm">S</span>
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-sm tracking-tight truncate">Sabush</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              className={`w-full flex items-center gap-3 rounded-xl transition group ${
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-[#D4AF37] text-[#0B1F3A]'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
              {!collapsed && (
                <span className="text-[13px] font-semibold truncate">{tab.shortLabel}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 shrink-0 border-t border-white/10">
        <button
          type="button"
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expandir menu' : 'Colapsar menu'}
          className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-white/50 hover:bg-white/10 hover:text-white transition ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-[12px] font-semibold">Colapsar</span>}
        </button>
      </div>
    </aside>
  );
};
