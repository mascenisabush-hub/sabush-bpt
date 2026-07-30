import React, { useState, useEffect } from 'react';
import { Search, Store, Check, X, Building2, Phone, MapPin, Mail, User, Sparkles } from 'lucide-react';
import { BUSINESS_CATEGORY_GROUPS, detectCategoryFromName } from '../data/businessCategories';

interface BusinessProfileSetupModalProps {
  currentName: string;
  currentCategory: string;
  currentContact: string;
  currentLocation: string;
  currentEmail: string;
  onSave: (profile: { name: string; category: string; contact: string; location: string; email: string }) => void | Promise<void>;
  onClose?: () => void;
  isFirstTimeSetup?: boolean;
}

/**
 * Full business profile setup: name, category, contact, location and email.
 * Shown as the first-time onboarding step (replacing the old category-only
 * modal) whenever a business is missing any of these fields, and reachable
 * again later from Settings for editing.
 */
export const BusinessProfileSetupModal: React.FC<BusinessProfileSetupModalProps> = ({
  currentName,
  currentCategory,
  currentContact,
  currentLocation,
  currentEmail,
  onSave,
  onClose,
  isFirstTimeSetup = false,
}) => {
  const [name, setName] = useState(currentName || '');
  const [contact, setContact] = useState(currentContact || '');
  const [location, setLocation] = useState(currentLocation || '');
  const [email, setEmail] = useState(currentEmail || '');
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState(currentCategory || '');
  const [customText, setCustomText] = useState(
    currentCategory && !BUSINESS_CATEGORY_GROUPS.some(g => g.categories.includes(currentCategory))
      ? currentCategory
      : ''
  );
  const [isCustomMode, setIsCustomMode] = useState(
    currentCategory === 'Outro' ||
      (!!currentCategory && !BUSINESS_CATEGORY_GROUPS.some(g => g.categories.includes(currentCategory)))
  );
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  // Once the user manually interacts with the category picker, stop
  // overwriting their choice as they keep editing the business name.
  const [categoryTouchedManually, setCategoryTouchedManually] = useState(!!currentCategory);
  const [autoDetectedCategory, setAutoDetectedCategory] = useState<string | null>(null);

  // Auto-detect category from the business name as the owner types it.
  useEffect(() => {
    if (categoryTouchedManually) return;
    const detected = detectCategoryFromName(name);
    if (detected) {
      setSelectedCat(detected);
      setIsCustomMode(false);
      setAutoDetectedCategory(detected);
    } else {
      setAutoDetectedCategory(null);
    }
  }, [name, categoryTouchedManually]);

  const handleCategoryClick = (cat: string) => {
    setCategoryTouchedManually(true);
    setAutoDetectedCategory(null);
    if (cat === 'Outro') {
      setIsCustomMode(true);
      setSelectedCat('Outro');
    } else {
      setIsCustomMode(false);
      setSelectedCat(cat);
    }
  };

  const filteredGroups = BUSINESS_CATEGORY_GROUPS.map(group => {
    const matchingCategories = group.categories.filter(cat =>
      cat.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...group, categories: matchingCategories };
  }).filter(group => group.categories.length > 0);

  const finalCategory = isCustomMode ? (customText.trim() || 'Outro') : selectedCat;

  const [isSaving, setIsSaving] = useState(false);

  // onSave is async at its only call site (SettingsModal.tsx, which awaits
  // updateBusinessProfile — a Firestore write that can reject). It must be
  // awaited and caught here too, or a rejection is silently swallowed
  // while this modal closes as if the profile was saved. Same class of
  // bug already fixed in AddExpenseView/AddWithdrawalView/AddQuebraView.
  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Por favor indique o nome do negócio.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), category: finalCategory, contact: contact.trim(), location: location.trim(), email: email.trim() });
      if (onClose) onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao guardar o perfil do negócio.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                {isFirstTimeSetup ? 'Perfil do seu Negócio' : 'Editar Perfil do Negócio'}
                {isFirstTimeSetup && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
                    Configuração Inicial
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500">
                Estes dados identificam o seu negócio na aplicação e nos relatórios.
              </p>
            </div>
          </div>

          {!isFirstTimeSetup && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-800 rounded-xl hover:bg-gray-50 transition shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Business Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" /> Nome do Negócio
            </label>
            <input
              type="text"
              placeholder="ex.: Mercearia Central"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-[10px] text-gray-800 text-sm placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
          </div>

          {/* Contact & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-600" /> Contacto (Telefone)
              </label>
              <input
                type="tel"
                placeholder="ex.: 84 123 4567"
                value={contact}
                onChange={e => setContact(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-[10px] text-gray-800 text-sm placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Localização
              </label>
              <input
                type="text"
                placeholder="ex.: Maputo, Bairro Central"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-[10px] text-gray-800 text-sm placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600" /> Email de Contacto
            </label>
            <input
              type="email"
              placeholder="ex.: contacto@negocio.co.mz"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-[10px] text-gray-800 text-sm placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
          </div>

          {/* Category picker (collapsible) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" /> Ramo de Negócio
              </label>
              <button
                type="button"
                onClick={() => setShowCategoryPicker(v => !v)}
                className="text-[11px] text-blue-600 font-semibold hover:underline"
              >
                {showCategoryPicker ? 'Fechar lista' : 'Alterar'}
              </button>
            </div>
            <div
              className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between gap-2 border ${
                selectedCat || (isCustomMode && customText)
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-gray-100/60 border-gray-200 text-gray-400 italic font-normal'
              }`}
            >
              <span className="truncate">
                {isCustomMode
                  ? (customText || 'Outro')
                  : (selectedCat || 'Comece a escrever o nome do negócio para detetar automaticamente...')}
              </span>
              {(selectedCat || (isCustomMode && customText)) && (
                autoDetectedCategory && !categoryTouchedManually ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 shrink-0 whitespace-nowrap">
                    <Sparkles className="w-3.5 h-3.5" /> Auto-detetado
                  </span>
                ) : (
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                )
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              A categoria selecionada personaliza as unidades de medida sugeridas na entrada de stock. Detetamos automaticamente a partir do nome do negócio — clique em &quot;Alterar&quot; para escolher manualmente.
            </p>

            {showCategoryPicker && (
              <div className="border border-gray-200 rounded-2xl p-3 space-y-4 mt-2 animate-fadeIn">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Pesquisar categoria (ex.: Mercearia, Talho, Roupa...)"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-[10px] text-gray-800 text-sm placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                </div>

                <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
                  {filteredGroups.length === 0 ? (
                    <div className="py-6 text-center text-gray-500 text-sm">
                      <p className="mb-2">Nenhuma categoria encontrada para &quot;{searchTerm}&quot;.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomMode(true);
                          setCustomText(searchTerm);
                          setSelectedCat('Outro');
                        }}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        + Usar &quot;{searchTerm}&quot; como categoria personalizada (Outro)
                      </button>
                    </div>
                  ) : (
                    filteredGroups.map(group => (
                      <div key={group.groupName} className="space-y-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-500" />
                          {group.groupName}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {group.categories.map(cat => {
                            const isSelected = !isCustomMode && selectedCat === cat;
                            const isOutro = cat === 'Outro';
                            const isCustomSelected = isOutro && isCustomMode;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => handleCategoryClick(cat)}
                                className={`text-left text-xs px-3 py-2.5 rounded-xl border transition flex items-center justify-between font-medium ${
                                  isSelected || isCustomSelected
                                    ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-md shadow-blue-50'
                                    : 'bg-gray-100/60 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-100/80'
                                }`}
                              >
                                <span className="truncate">{cat}</span>
                                {(isSelected || isCustomSelected) && (
                                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {isCustomMode && (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-2">
                    <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider">
                      Especifique a Categoria
                    </label>
                    <input
                      type="text"
                      placeholder="ex.: Loja de Molduras, Marcenaria..."
                      value={customText}
                      onChange={e => setCustomText(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-[10px] text-gray-800 text-sm transition-all duration-150 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary py-2.5 px-6 text-sm disabled:opacity-60"
          >
            <span>{isSaving ? 'A guardar...' : isFirstTimeSetup ? 'Concluir Configuração' : 'Guardar Alterações'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
