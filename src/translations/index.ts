import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import de from './languages/de.json';

export function setupLanguages() {
  i18n
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
      resources: {
        de: {
          translation: de,
        },
      },

      interpolation: {
        escapeValue: false,
      },
    });
}
