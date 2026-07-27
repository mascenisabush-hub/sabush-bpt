import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { pt, type TranslationDict } from '../i18n/locales/pt';
import { en } from '../i18n/locales/en';
import { fr } from '../i18n/locales/fr';

export type Language = 'pt' | 'en' | 'fr';

export const SUPPORTED_LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
];

const DICTIONARIES: Record<Language, TranslationDict> = { pt, en, fr };

const STORAGE_KEY = 'sabush-bpt-language';

function getNestedValue(dict: TranslationDict, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (acc, [paramKey, value]) => acc.split(`{{${paramKey}}}`).join(String(value)),
    template,
  );
}

function detectInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'pt';

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'pt' || stored === 'en' || stored === 'fr') {
    return stored;
  }

  // Sabush Tech's primary market (Mozambique) is Portuguese-speaking, so
  // that's the default. Only fall back to the browser's language when it's
  // explicitly English or French.
  const browserLang = window.navigator?.language?.slice(0, 2).toLowerCase();
  if (browserLang === 'en') return 'en';
  if (browserLang === 'fr') return 'fr';
  return 'pt';
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Translate a dot-separated key, e.g. t('auth.form.email'). Supports
   * {{param}} interpolation via the optional params argument. */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(detectInitialLanguage);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // localStorage can throw in private-browsing/sandboxed contexts —
      // language selection just won't persist across sessions, which is fine.
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const active = DICTIONARIES[language];
      let value = getNestedValue(active, key);

      if (typeof value !== 'string' && language !== 'pt') {
        // Fall back to Portuguese (canonical dictionary) for any key that
        // hasn't been translated yet in the active language.
        value = getNestedValue(DICTIONARIES.pt, key);
      }

      if (typeof value !== 'string') {
        console.warn(`[i18n] Missing translation for key: "${key}"`);
        return key;
      }

      return interpolate(value, params);
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
