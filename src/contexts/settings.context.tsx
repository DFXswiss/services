import {
  Fiat,
  InfoBanner,
  Language,
  useCountry,
  useFiatContext,
  useKyc,
  useLanguage,
  useLanguageContext,
  UserData,
  useSettings,
  useUserContext,
} from '@dfx.swiss/react';
import browserLang from 'browser-lang';
import i18n from 'i18next';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppParams } from '../hooks/app-params.hook';
import { useStore } from '../hooks/store.hook';
import { useAppHandlingContext } from './app-handling.context';

const ValidationErrors: Record<string, string> = {
  required: 'Mandatory field',
  pattern: 'Invalid pattern',
  code_and_number: 'Area code and number required',
  iban_blocked: 'IBAN not allowed',
  iban_country_blocked: 'IBAN country not allowed',
  xml_file: 'Only XML files are allowed',
  json_file: 'Only JSON files are allowed',
  file_type: 'Allowed formats: PDF, JPG, JPEG, PNG',
  date_format: 'Invalid date format',
};

const languageToLocale: { [language: string]: string } = {
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  it: 'it-IT',
};

interface SettingsInterface {
  availableLanguages: Language[];
  locale: string;
  language?: Language;
  currency?: Fiat;
  changeLanguage: (language: Language) => void;
  changeCurrency: (currency: Fiat) => void;
  changeMail: (mail: string) => void;
  changePhone: (phone: string) => void;
  translate: (key: string, defaultValue: string, interpolation?: Record<string, string | number>) => string;
  translateError: (key: string) => string;
  processingKycData: boolean;
  infoBanner?: InfoBanner;
  closeInfoBanner: () => void;
  // generic storage
  get: <T>(key: string) => T | undefined;
  put: <T>(key: string, value: T | undefined) => void;
}

const SettingsContext = createContext<SettingsInterface>(undefined as any);

export function useSettingsContext(): SettingsInterface {
  return useContext(SettingsContext);
}

export function SettingsContextProvider(props: PropsWithChildren): JSX.Element {
  const { languages } = useLanguageContext();
  const { currencies } = useFiatContext();
  const { getDefaultLanguage } = useLanguage();
  const {
    user,
    changeLanguage: changeUserLanguage,
    changeMail: changeUserMail,
    changePhone: changeUserPhone,
    changeCurrency: changeUserCurrency,
  } = useUserContext();
  const { language: storedLanguage, infoBanner: storedInfoBanner } = useStore();
  const { getCountries } = useCountry();
  const { setData } = useKyc();
  const {
    lang,
    mail,
    accountType,
    firstName,
    lastName,
    street,
    houseNumber,
    zip,
    city,
    country,
    organizationName,
    organizationStreet,
    organizationHouseNumber,
    organizationZip,
    organizationCity,
    organizationCountry,
    phone,
    setParams,
  } = useAppParams();
  const { isInitialized } = useAppHandlingContext();
  const { t } = useTranslation();
  const { getInfoBanner } = useSettings();

  const [language, setLanguage] = useState<Language>();
  const [currency, setCurrency] = useState<Fiat>();
  const [store, setStore] = useState<Record<string, any>>({});
  const [processingKycData, setProcessingKycData] = useState(true);
  const [infoBanner, setInfoBanner] = useState<InfoBanner>();

  const appLanguages = ['DE', 'EN', 'FR', 'IT'];
  const availableLanguages = languages?.filter((l) => appLanguages.includes(l.symbol)) ?? [];

  useEffect(() => {
    getInfoBanner().then((infoBanner) => {
      if (JSON.stringify(infoBanner) === JSON.stringify(storedInfoBanner.get())) return;
      setInfoBanner(infoBanner);
      storedInfoBanner.remove();
    });
  }, []);

  useEffect(() => {
    const browserLanguage = browserLang({ languages: appLanguages.map((l) => l.toLowerCase()), fallback: 'en' });
    const customLanguage =
      lang?.toUpperCase() ?? user?.language.symbol ?? storedLanguage.get() ?? browserLanguage.toUpperCase();
    const customCurrency = user?.currency;
    const newAppLanguage =
      availableLanguages.find((l) => l.symbol === customLanguage) ?? getDefaultLanguage(availableLanguages);

    newAppLanguage && newAppLanguage.id !== language?.id && changeAppLanguage(newAppLanguage);
    customCurrency && customCurrency.id !== currency?.id && setCurrency(customCurrency);
  }, [user, lang, languages, currencies]);

  useEffect(() => {
    if (user && mail && user.mail !== mail) changeUserMail(mail);
  }, [user, mail]);

  useEffect(() => {
    if (!user?.kyc.hash || !isInitialized) return;
    if (!accountType) {
      setProcessingKycData(false);
      return;
    }
    getCountries()
      .then((countries) => countries.filter((c) => c.kycAllowed))
      .then((cs) => {
        setData({
          mail,
          accountType,
          firstName,
          lastName,
          phone,
          address: {
            street: street,
            houseNumber: houseNumber,
            city: city,
            zip: zip,
            country: cs.find((c) => c.symbol === country || c.name === country),
          },
          organizationName,
          organizationAddress: organizationName && {
            street: organizationStreet,
            houseNumber: organizationHouseNumber,
            city: organizationCity,
            zip: organizationZip,
            country: cs.find((c) => c.symbol === organizationCountry || c.name === organizationCountry),
          },
        } as UserData)
          .catch(() => {
            // Ignore API errors
          })
          .finally(() => setProcessingKycData(false));
      });
  }, [
    user,
    mail,
    accountType,
    firstName,
    lastName,
    street,
    houseNumber,
    zip,
    city,
    country,
    organizationName,
    organizationStreet,
    organizationHouseNumber,
    organizationZip,
    organizationCity,
    organizationCountry,
    phone,
    isInitialized,
  ]);

  function closeInfoBanner() {
    setInfoBanner(undefined);
    infoBanner && storedInfoBanner.set(infoBanner);
  }

  function changeAppLanguage(lang: Language) {
    setLanguage(lang);
    i18n.changeLanguage(lang.symbol.toLowerCase());
    storedLanguage.set(lang.symbol);
  }

  function changeLanguage(lang: Language) {
    if (!availableLanguages.some((l) => l.id === lang.id) || language?.id === lang.id) return;

    setParams({ lang: undefined });
    changeAppLanguage(lang);
    changeUserLanguage(lang);
  }

  function changeCurrency(newCurrency: Fiat) {
    if (!currencies?.some((c) => c.id === newCurrency.id) || currency?.id === newCurrency.id) return;

    changeUserCurrency(newCurrency);
  }

  function changeMail(mail: string) {
    setParams({ mail });
    changeUserMail(mail);
  }

  function changePhone(phone: string) {
    setParams({ phone });
    changeUserPhone(phone);
  }

  function translate(key: string, defaultValue: string, interpolation?: Record<string, string | number>): string {
    return t([key, defaultValue].join('.'), defaultValue, interpolation);
  }

  function translateError(key: string): string {
    return translate('general/errors', ValidationErrors[key]);
  }

  function get<T>(key: string): T | undefined {
    return store[key];
  }

  function put<T>(key: string, value: T): void {
    setStore((s) => ({ ...s, [key]: value }));
  }

  const context = useMemo(
    () => ({
      availableLanguages,
      locale: languageToLocale[language?.symbol.toLowerCase() ?? 'en'],
      language,
      currency,
      changeLanguage,
      changeCurrency,
      changeMail,
      changePhone,
      translate,
      translateError,
      processingKycData,
      infoBanner,
      closeInfoBanner,
      get,
      put,
    }),
    [availableLanguages, language, languageToLocale, store],
  );

  return <SettingsContext.Provider value={context}>{props.children}</SettingsContext.Provider>;
}
