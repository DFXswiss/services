import { Language, useLanguage, useLanguageContext, useUserContext } from '@dfx.swiss/react';
import i18n from 'i18next';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../hooks/store.hook';

interface SettingsInterface {
  homePath: string;
  availableLanguages: Language[];
  language?: Language;
  changeLanguage: (language: Language) => void;
  translate: (key: string, defaultValue: string, interpolation?: Record<string, string | number>) => string;
}

const SettingsContext = createContext<SettingsInterface>(undefined as any);

export function useSettingsContext(): SettingsInterface {
  return useContext(SettingsContext);
}

export function SettingsContextProvider(props: PropsWithChildren): JSX.Element {
  const [homePath] = useState<string>(window.location.pathname);

  const { languages } = useLanguageContext();
  const { getDefaultLanguage } = useLanguage();
  const { user, changeLanguage: changeUserLanguage } = useUserContext();
  const { language: storedLanguage } = useStore();

  const [language, setLanguage] = useState<Language>();
  const { t } = useTranslation();

  const availableLanguages = languages?.filter((l) => ['DE', 'EN'].includes(l.symbol)) ?? [];

  useEffect(() => {
    const userLanguage = user?.language.symbol ?? storedLanguage.get();
    const newAppLanguage =
      availableLanguages?.find((l) => l.symbol === userLanguage) ?? getDefaultLanguage(availableLanguages);
    newAppLanguage && changeAppLanguage(newAppLanguage);
  }, [user, languages]);

  function changeAppLanguage(language: Language) {
    setLanguage(language);
    i18n.changeLanguage(language.symbol.toLowerCase());
    storedLanguage.set(language.symbol);
  }

  function changeLanguage(language: Language) {
    changeAppLanguage(language);
    changeUserLanguage(language);
  }

  const context = useMemo(
    () => ({
      homePath,
      availableLanguages,
      language,
      changeLanguage,
      translate: (key: string, defaultValue: string, interpolation?: Record<string, string | number>) =>
        t([key, defaultValue].join('.'), defaultValue, interpolation),
    }),
    [availableLanguages, language, changeLanguage],
  );

  return <SettingsContext.Provider value={context}>{props.children}</SettingsContext.Provider>;
}
