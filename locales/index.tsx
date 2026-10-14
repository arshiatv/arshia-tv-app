// Language handling for Arshia TV.
//
// Persian is the app's main language and English sits next to it, so a viewer can switch
// at any time from the More screen. Each screen keeps its own copy for both languages
// right next to the layout it belongs to, so a translation can never go missing and show
// up on screen as a raw key.

import React, { createContext, useContext, useMemo, useState } from 'react';
import * as Localization from 'expo-localization';

export type Lang = 'en' | 'fa';

interface LanguageValue {
  lang: Lang;
  setLang: (next: Lang) => void;
}

const LanguageContext = createContext<LanguageValue>({
  lang: 'fa',
  setLang: () => {},
});

// Persian unless the phone is set to English: Arshia TV is made for Persian viewers, so
// anything else (Arabic, Turkish, an unreadable value) lands on Persian too.
function initialLang(): Lang {
  try {
    const locales = Localization.getLocales?.();
    const raw = locales?.[0]?.languageCode || Localization.locale || 'fa';
    return String(raw).slice(0, 2).toLowerCase() === 'en' ? 'en' : 'fa';
  } catch (error) {
    return 'fa';
  }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>(initialLang);

  const value = useMemo<LanguageValue>(() => ({ lang, setLang }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useTranslation = (): LanguageValue => useContext(LanguageContext);
      
