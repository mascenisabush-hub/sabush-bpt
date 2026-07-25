import React, { useState } from 'react';
import { Search, Bell, ChevronDown, Menu, X } from 'lucide-react';

export type NavSection = 'Dashboard' | 'Inventory' | 'Sales' | 'Reports' | 'Settings';

const NAV_LINKS: NavSection[] = ['Dashboard', 'Inventory', 'Sales', 'Reports', 'Settings'];

interface TopNavbarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ activeSection, onSelectSection }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-[#0B1F3A] flex items-center justify-center">
              <span className="text-[#D4AF37] font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-[#0B1F3A] tracking-tight text-base sm:text-lg whitespace-nowrap">
              SABUSH TECH
            </span>
          </div>

          {/* Center: Nav links (desktop) */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_LINKS.map(link => {
              const isActive = activeSection === link;
              return (
                <button
                  key={link}
                  onClick={() => onSelectSection(link)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#0B1F3A] text-white'
                      : 'text-[#111827]/70 hover:text-[#0B1F3A] hover:bg-gray-50'
                  }`}
                >
                  {link}
                </button>
              );
            })}
          </nav>

          {/* Right: search, notifications, profile */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 w-44 lg:w-56 focus-within:ring-2 focus-within:ring-[#D4AF37]/40 focus-within:border-[#D4AF37] transition">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="bg-transparent outline-none text-sm text-[#111827] placeholder-gray-400 ml-2 w-full"
              />
            </div>

            <button
              aria-label="Notificações"
              className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Bell className="w-5 h-5 text-[#111827]/70" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F59E0B]" />
            </button>

            <div className="relative">
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#0B1F3A] flex items-center justify-center text-white text-xs font-bold">
                  MS
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-40">
                  <button className="w-full text-left px-4 py-2 text-sm text-[#111827] hover:bg-gray-50">Meu Perfil</button>
                  <button className="w-full text-left px-4 py-2 text-sm text-[#111827] hover:bg-gray-50">Configurações</button>
                  <div className="border-t border-gray-100 my-1" />
                  <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">Terminar Sessão</button>
                </div>
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
              const isActive = activeSection === link;
              return (
                <button
                  key={link}
                  onClick={() => {
                    onSelectSection(link);
                    setMobileOpen(false);
                  }}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? 'bg-[#0B1F3A] text-white' : 'bg-gray-50 text-[#111827]/70'
                  }`}
                >
                  {link}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
