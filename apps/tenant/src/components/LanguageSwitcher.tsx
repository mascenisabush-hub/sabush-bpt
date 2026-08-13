import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';

// Compact language toggle — three short codes (PT/EN/FR) rather than a
// dropdown, since it's almost always used pre-login where space is tight.
export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center gap-1 bg-gray-100/80 border border-gray-200 rounded-full p-1 ${className}`}
      role="group"
      aria-label="Language selector"
    >
      <Globe className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
      {SUPPORTED_LANGUAGES.map(({ code, nativeLabel }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          aria-pressed={language === code}
          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition ${
            language === code
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
          title={nativeLabel}
        >
          {code}
        </button>
      ))}
    </div>
  );
};
