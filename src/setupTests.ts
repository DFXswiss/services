// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import i18n from 'i18next';
import { setupLanguages } from './translations';

// Partner dashboard (and any useTranslation consumer) needs the same i18n init as the app.
// Force English so tests assert on the English base keys/defaults, not the host browser language.
setupLanguages();
void i18n.changeLanguage('en');
