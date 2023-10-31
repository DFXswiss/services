import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './languages/de.json';
import fr from './languages/fr.json';
import it from './languages/it.json';

export function setupLanguages() {
  i18n.use(initReactI18next).init({
    resources: {
      de: { translation: de },
      fr: { translation: fr },
      it: { translation: it },
    },
    interpolation: {
      escapeValue: false,
    },
  });
}
