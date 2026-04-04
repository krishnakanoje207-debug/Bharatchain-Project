import { createContext, useContext, useState, useCallback } from 'react';
import translations from './translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(localStorage.getItem('bharatchain_lang') || 'en');

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => {
      const next = prev === 'en' ? 'hi' : 'en';
      localStorage.setItem('bharatchain_lang', next);
      return next;
    });
  }, []);

  const setLang = useCallback((lang) => {
    setLanguage(lang);
    localStorage.setItem('bharatchain_lang', lang);
  }, []);

  const t = useCallback((key, fallback) => {
    return translations[language]?.[key] || translations['en']?.[key] || fallback || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
