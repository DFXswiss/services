import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

export function setupLanguages() {
  i18n
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
      resources: {
        // de: {
        //   translation: de,
        // },
        // TODO: (Krysh) add languages
      },

      interpolation: {
        escapeValue: false,
      },
    });
}
