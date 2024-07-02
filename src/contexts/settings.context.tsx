import {
  KycPersonalData,
  KycResult,
  KycSession,
  KycStepName,
  KycStepStatus,
  Language,
  useKyc,
  useLanguage,
  useLanguageContext,
  useUserContext,
} from '@dfx.swiss/react';
import browserLang from 'browser-lang';
import i18n from 'i18next';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppParams } from '../hooks/app-params.hook';
import { useStore } from '../hooks/store.hook';

const ValidationErrors: Record<string, string> = {
  required: 'Mandatory field',
  pattern: 'Invalid pattern',
  code_and_number: 'Area code and number required',
  iban_blocked: 'IBAN not allowed',
  iban_country_blocked: 'IBAN country not allowed',
};

interface SettingsInterface {
  availableLanguages: Language[];
  language?: Language;
  changeLanguage: (language: Language) => void;
  translate: (key: string, defaultValue: string, interpolation?: Record<string, string | number>) => string;
  translateError: (key: string) => string;
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
  const { getDefaultLanguage } = useLanguage();
  const { user, changeLanguage: changeUserLanguage, changeMail: changeUserMail } = useUserContext();
  const { language: storedLanguage } = useStore();
  const { getCountries, startStep, setPersonalData } = useKyc();
  const { queryParams } = useStore();
  const {
    lang,
    mail,
    accountType,
    firstName,
    lastName,
    personalStreet,
    personalHouseNumber,
    personalZip,
    personalCity,
    personalCountry,
    organizationName,
    organizationStreet,
    organizationHouseNumber,
    organizationZip,
    organizationCity,
    organizationCountry,
    phone,
    setParams,
  } = useAppParams();
  const { t } = useTranslation();

  const [language, setLanguage] = useState<Language>();
  const [store, setStore] = useState<Record<string, any>>({});

  const appLanguages = ['DE', 'EN', 'FR', 'IT'];
  const availableLanguages = languages?.filter((l) => appLanguages.includes(l.symbol)) ?? [];

  useEffect(() => {
    const browserLanguage = browserLang({ languages: appLanguages.map((l) => l.toLowerCase()), fallback: 'en' });
    const customLanguage =
      lang?.toUpperCase() ?? user?.language.symbol ?? storedLanguage.get() ?? browserLanguage.toUpperCase();
    const newAppLanguage =
      availableLanguages.find((l) => l.symbol === customLanguage) ?? getDefaultLanguage(availableLanguages);

    newAppLanguage && newAppLanguage.id !== language?.id && changeAppLanguage(newAppLanguage);
  }, [user, lang, languages]);

  useEffect(() => {
    if (user && mail && user.mail !== mail) changeUserMail(mail);
  }, [user, mail]);

  useEffect(() => {
    if (user?.kyc.hash && accountType && firstName) {
      startStep(user.kyc.hash, KycStepName.PERSONAL_DATA)
        .then(handlePersonalData)
        .catch((e) => {
          console.error(e);
          // ignore API error, e.g. 2FA required
        });
    }
  }, [
    user,
    accountType,
    firstName,
    lastName,
    personalStreet,
    personalHouseNumber,
    personalZip,
    personalCity,
    personalCountry,
    organizationName,
    organizationStreet,
    organizationHouseNumber,
    organizationZip,
    organizationCity,
    organizationCountry,
    phone,
  ]);

  // ExampleURL: localhost:3001/?account-type=Personal&first-name=John&last-name=Doe&personal-street=Maine&personal-house-number=1&personal-zip=12345&personal-city=Cityo&personal-country=Germany&phone=00498004353361&mail=jodoe@eodoj.com&session=1234 // TODO: Remove
  async function handlePersonalData(kycSession: KycSession) {
    console.log(kycSession);
    if (
      user?.kyc.hash &&
      kycSession.currentStep?.session?.url &&
      [KycStepStatus.NOT_STARTED, KycStepStatus.IN_PROGRESS].includes(kycSession.currentStep.status)
    ) {
      console.log('Handling personal data...');
      const countries = await getCountries(user.kyc.hash);
      const country = countries.find((c) => c.symbol === personalCountry || c.name === personalCountry);
      const orgCountry = countries.find((c) => c.symbol === organizationCountry || c.name === organizationCountry);

      console.log(user!.kyc.hash, kycSession.currentStep?.session?.url);
      console.log(country);
      setPersonalData(user!.kyc.hash, kycSession.currentStep?.session?.url, {
        accountType,
        firstName,
        lastName,
        phone,
        address: {
          street: personalStreet,
          houseNumber: personalHouseNumber,
          city: personalCity,
          zip: personalZip,
          country: country,
        },
        organizationName,
        organizationAddress: {
          street: organizationStreet,
          houseNumber: organizationHouseNumber,
          city: organizationCity,
          zip: organizationZip,
          country: orgCountry,
        },
      } as KycPersonalData)
        .then((kycResult: KycResult) => {
          console.log('Personal data saved');
          console.log(kycResult);
          // TODO: Remove KYC params from local storage to avoid retriggers?
        })
        .catch((e: any) => {
          console.error(e);
          // ignore API error
        });
    }
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
      language,
      changeLanguage,
      translate,
      translateError,
      get,
      put,
    }),
    [availableLanguages, language, store],
  );

  return <SettingsContext.Provider value={context}>{props.children}</SettingsContext.Provider>;
}
