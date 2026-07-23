import React, { useState } from 'react';
import { Search, Store, Check, X, Building2, Sparkles } from 'lucide-react';
import { BUSINESS_CATEGORY_GROUPS } from '../data/businessCategories';

interface BusinessCategoryModalProps {
  currentCategory: string;
  onSelectCategory: (category: string) => void;
  onClose?: () => void;
  isFirstTimeSetup?: boolean;
}

export const BusinessCategoryModal: React.FC<BusinessCategoryModalProps> = ({
  currentCategory,
  onSelectCategory,
  onClose,
  isFirstTimeSetup = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState(currentCategory || 'Mercearia');
  const [customText, setCustomText] = useState(
    currentCategory && !BUSINESS_CATEGORY_GROUPS.some(g => g.categories.includes(currentCategory))
      ? currentCategory
      : ''
  );
  const [isCustomMode, setIsCustomMode] = useState(
    currentCategory === 'Outro' ||
      (!!currentCategory && !BUSINESS_CATEGORY_GROUPS.some(g => g.categories.includes(currentCategory)))
  );

  const handleCategoryClick = (cat: string) => {
    if (cat === 'Outro') {
      setIsCustomMode(true);
      setSelectedCat('Outro');
    } else {
      setIsCustomMode(false);
      setSelectedCat(cat);
    }
  };

  const handleSave = () => {
    const finalCategory = isCustomMode ? customText.trim() || 'Outro' : selectedCat;
    if (!finalCategory) {
      alert('Por favor selecione ou introduza uma categoria para o seu negócio.');
      return;
    }
    onSelectCategory(finalCategory);
    if (onClose) onClose();
  };

  // Filter category groups based on search term
  const filteredGroups = BUSINESS_CATEGORY_GROUPS.map(group => {
    const matchingCategories = group.categories.filter(cat =>
      cat.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return {
      ...group,
      categories: matchingCategories,
    };
  }).filter(group => group.categories.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                {isFirstTimeSetup ? 'Qual é o ramo do seu negócio?' : 'Ramo do Negócio'}
                {isFirstTimeSetup && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Configuração Inicial
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                A categoria selecionada personaliza as unidades de medida sugeridas na entrada de stock.
              </p>
            </div>
          </div>

          {!isFirstTimeSetup && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar categoria de negócio (ex.: Mercearia, Talho, Roupa...)"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Categories Grouped List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 min-h-[200px] max-h-[360px]">
          {filteredGroups.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              <p className="mb-2">Nenhuma categoria encontrada para &quot;{searchTerm}&quot;.</p>
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(true);
                  setCustomText(searchTerm);
                  setSelectedCat('Outro');
                }}
                className="text-xs text-emerald-400 hover:underline font-semibold"
              >
                + Usar &quot;{searchTerm}&quot; como categoria personalizada (Outro)
              </button>
            </div>
          ) : (
            filteredGroups.map(group => (
              <div key={group.groupName} className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
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
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/30'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        {(isSelected || isCustomSelected) && (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Custom Text Field if Outro / Custom mode */}
        {isCustomMode && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 animate-fadeIn">
            <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Especifique a Categoria do seu Negócio
            </label>
            <input
              type="text"
              placeholder="ex.: Loja de Molduras, Marcenaria, Salão de Festas..."
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>
        )}

        {/* Selected Summary & Action Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Selecionado: <strong className="text-emerald-300">{isCustomMode ? customText || 'Outro' : selectedCat}</strong>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2 active:scale-[0.98]"
          >
            <span>Confirmar Categoria</span>
          </button>
        </div>
      </div>
    </div>
  );
};
