import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import de from '../translations/de.json';

export interface LanguageInterface {
  language: string;
  changeLanguage: (language: string) => void;
  translate: (key: string, defaultValue: string) => string;
}

const LanguageContext = createContext<LanguageInterface>(undefined as any);

export function useLanguageContext(): LanguageInterface {
  return useContext(LanguageContext);
}

export function LanguageContextProvider(props: PropsWithChildren): JSX.Element {
  const [language, setLanguage] = useState<string>('en');
  const { t } = useTranslation();

  useEffect(() => {
    setupLanguages(language);
  }, [language]);

  function setupLanguages(language: string) {
    i18n.use(initReactI18next).init({
      resources: {
        de: {
          translation: de,
        },
      },
      lng: language,

      interpolation: {
        escapeValue: false,
      },
    });
  }

  function changeLanguage(language: string) {
    setLanguage(language);
    setupLanguages(language);
  }

  const context = useMemo(
    () => ({
      language,
      changeLanguage,
      translate: (key: string, defaultValue: string) => t([key, defaultValue].join('.'), defaultValue),
    }),
    [language, changeLanguage],
  );

  return <LanguageContext.Provider value={context}>{props.children}</LanguageContext.Provider>;
}
