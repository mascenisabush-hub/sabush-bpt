import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCY_OPTIONS } from '../utils/formatters';
import { ChevronDown, Check, Plus, Store, X } from 'lucide-react';
import { BUSINESS_CATEGORY_GROUPS, detectCategoryFromName } from '../data/businessCategories';

// Owner-only. Staff never see this — they belong to exactly one shop and
// that never changes (see firestore.rules: businessId is immutable after
// creation for every account, staff included).
export const ShopSwitcher: React.FC = () => {
  const { isOwner, ownedBusinesses, activeBusinessId, maxShopsPerOwner, switchShop, addShop } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newCurrency, setNewCurrency] = useState('MT');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowAddForm(false);
        setError(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOwner) return null;

  const active = ownedBusinesses.find((b) => b.id === activeBusinessId);
  const atLimit = ownedBusinesses.length >= maxShopsPerOwner;

  const handleSwitch = async (businessId: string) => {
    if (businessId === activeBusinessId) {
      setIsOpen(false);
      return;
    }
    try {
      await switchShop(businessId);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao mudar de loja.');
    }
  };

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await addShop(newName.trim(), newCategory.trim(), newCurrency);
      setNewName('');
      setNewCategory('');
      setNewCurrency('MT');
      setShowAddForm(false);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar loja.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8A6D1F] mb-0.5 hover:text-[#9C6613] transition-colors"
      >
        Meu Negócio
        {ownedBusinesses.length > 1 && <ChevronDown className="w-3 h-3" />}
      </button>

      {isOpen && (
        <div className="absolute z-30 top-full left-0 mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          {!showAddForm ? (
            <>
              <div className="max-h-64 overflow-y-auto py-1">
                {ownedBusinesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleSwitch(b.id)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-[#F7F8FA] transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#0B1F3A]/5 flex items-center justify-center shrink-0">
                      <Store className="w-3.5 h-3.5 text-[#0B1F3A]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-800 truncate">{b.name}</p>
                      {b.category && <p className="text-[11px] text-gray-500 truncate">{b.category}</p>}
                    </div>
                    {b.id === activeBusinessId && <Check className="w-4 h-4 text-[#D4AF37] shrink-0" />}
                  </button>
                ))}
              </div>

              {error && <p className="text-[11px] text-red-600 px-3.5 pb-2">{error}</p>}

              <div className="border-t border-gray-100 p-2">
                <button
                  onClick={() => { setError(null); setShowAddForm(true); }}
                  disabled={atLimit}
                  className="w-full flex items-center justify-center gap-1.5 text-[12px] font-bold text-[#0B1F3A] disabled:text-gray-300 py-2 rounded-lg hover:bg-[#F7F8FA] disabled:hover:bg-transparent transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {atLimit ? `Limite de ${maxShopsPerOwner} lojas atingido` : `Adicionar Loja (${ownedBusinesses.length}/${maxShopsPerOwner})`}
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleAddShop} className="p-3.5 space-y-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] font-bold text-[#0B1F3A]">Nova Loja</p>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (!newCategory) {
                    const detected = detectCategoryFromName(e.target.value);
                    if (detected) setNewCategory(detected);
                  }
                }}
                placeholder="Nome da loja"
                required
                autoFocus
                className="w-full text-[13px] px-3 py-2 rounded-[10px] border border-[#E5E7EB] transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />

              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full text-[13px] px-3 py-2 rounded-[10px] border border-[#E5E7EB] transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 bg-white"
              >
                <option value="">Categoria (opcional)</option>
                {BUSINESS_CATEGORY_GROUPS.map((group) => (
                  <optgroup key={group.groupName} label={group.groupName}>
                    {group.categories.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <select
                value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value)}
                className="w-full text-[13px] px-3 py-2 rounded-[10px] border border-[#E5E7EB] transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 bg-white"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.symbol}>{c.label}</option>
                ))}
              </select>

              {error && <p className="text-[11px] text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isSaving || !newName.trim()}
                className="btn-dark w-full text-[13px] py-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSaving ? 'A criar...' : 'Criar Loja'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
