import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';

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

  function changeLanguage(language: string) {
    setLanguage(language);
    i18n.changeLanguage(language);
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
