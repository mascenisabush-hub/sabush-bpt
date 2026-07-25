import React, { useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TabType } from '../NavigationTabs';

// ============================================================
// REAL DATA / REAL ACTIONS ONLY.
//
// "Sales" was removed: the app has no sales-tracking feature (it only
// ever tracks Embedded Profit on unsold inventory — see calculations.ts
// comments), so there is no equivalent to map that link to.
//
// "Inventory" -> existing Stocks tab. "Reports" -> existing Relatórios
// tab. Both navigate via the same 'navigate-tab' window event App.tsx
// already listens for — no new navigation is introduced.
//
// "Definições" opens the existing Settings modal (SettingsModal via
// Header.tsx). That modal only mounts inside the normal app shell, so
// we first switch away from this full-screen view back to 'dashboard'
// (same as the existing "← Voltar à app principal" exit link) and then
// dispatch the existing 'open-settings' event once Header has mounted.
//
// The profile menu mirrors Header.tsx exactly: Definições + Sair
// (logout) — no "Meu Perfil" entry was added since no such standalone
// feature exists.
// ============================================================
export type NavSection = 'Dashboard' | 'Inventory' | 'Reports';

const NAV_LINKS: { section: NavSection; tab?: TabType }[] = [
  { section: 'Dashboard' },
  { section: 'Inventory', tab: 'stocks' },
  { section: 'Reports', tab: 'reports' },
];

interface TopNavbarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
}

function navigateTo(tab: TabType) {
  window.dispatchEvent(new CustomEvent('navigate-tab', { detail: tab }));
}

function openSettings() {
  navigateTo('dashboard');
  // Header (which owns the Settings modal) only mounts on the normal
  // dashboard tab; give it a tick to mount before firing the existing
  // 'open-settings' event it listens for.
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('open-settings', { detail: { openProfileEdit: false } }));
  }, 50);
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ activeSection, onSelectSection }) => {
  const { business, userProfile, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSelect = (link: { section: NavSection; tab?: TabType }) => {
    onSelectSection(link.section);
    if (link.tab) navigateTo(link.tab);
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#0B1F3A] flex items-center justify-center shrink-0">
              <span className="text-[#D4AF37] font-bold text-sm">
                {(business?.name || 'S').charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-bold text-[#0B1F3A] tracking-tight text-base sm:text-lg whitespace-nowrap truncate">
              {business?.name || 'Sabush'}
            </span>
          </div>

          {/* Center: Nav links (desktop) */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_LINKS.map(link => {
              const isActive = activeSection === link.section;
              return (
                <button
                  key={link.section}
                  onClick={() => handleSelect(link)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#0B1F3A] text-white'
                      : 'text-[#111827]/70 hover:text-[#0B1F3A] hover:bg-gray-50'
                  }`}
                >
                  {link.section}
                </button>
              );
            })}
          </nav>

          {/* Right: profile */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#0B1F3A] flex items-center justify-center text-white text-xs font-bold">
                  {getInitials(userProfile?.name)}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-40">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        openSettings();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-[#111827] hover:bg-gray-50"
                    >
                      Definições
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                    >
                      Terminar Sessão
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-50"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5 text-[#0B1F3A]" /> : <Menu className="w-5 h-5 text-[#0B1F3A]" />}
            </button>
          </div>
        </div>

        {/* Mobile nav: horizontally scrollable */}
        {mobileOpen && (
          <div className="md:hidden flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
            {NAV_LINKS.map(link => {
              const isActive = activeSection === link.section;
              return (
                <button
                  key={link.section}
                  onClick={() => {
                    handleSelect(link);
                    setMobileOpen(false);
                  }}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? 'bg-[#0B1F3A] text-white' : 'bg-gray-50 text-[#111827]/70'
                  }`}
                >
                  {link.section}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
