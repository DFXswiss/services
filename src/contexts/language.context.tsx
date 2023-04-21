import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { Language } from '../definitions/language';

interface LanguageInterface {
  availableLanguages: Language[];
  language: string;
  changeLanguage: (language: string) => void;
  translate: (key: string, defaultValue: string, interpolation?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageInterface>(undefined as any);

export function useLanguageContext(): LanguageInterface {
  return useContext(LanguageContext);
}

export function LanguageContextProvider(props: PropsWithChildren): JSX.Element {
  // TODO: (Krysh) load all languages from API
  const availableLanguages = [
    { id: 1, symbol: 'EN', name: 'English', foreignName: 'English', enable: true },
    { id: 2, symbol: 'DE', name: 'German', foreignName: 'Deutsch', enable: true },
  ];
  const [language, setLanguage] = useState<string>('en');
  const { t } = useTranslation();

  function changeLanguage(language: string) {
    setLanguage(language);
    i18n.changeLanguage(language);
  }

  const context = useMemo(
    () => ({
      availableLanguages,
      language,
      changeLanguage,
      translate: (key: string, defaultValue: string, interpolation?: Record<string, string | number>) =>
        t([key, defaultValue].join('.'), defaultValue, interpolation),
    }),
    [availableLanguages, language, changeLanguage],
  );

  return <LanguageContext.Provider value={context}>{props.children}</LanguageContext.Provider>;
}
