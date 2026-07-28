const mockTranslate = jest.fn();

jest.mock('@dfx.swiss/react-components', () => ({
  StyledButton: ({ label }: { label: string }) => (
    <button type="button">{label}</button>
  ),
  StyledButtonColor: { STURDY_WHITE: 'sturdy-white' },
  StyledButtonWidth: { FULL: 'full' },
  StyledInfoText: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="prompt">{children}</div>
  ),
  StyledVerticalStack: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('../contexts/settings.context', () => ({
  useSettingsContext: () => ({ translate: mockTranslate }),
}));

import { cleanup, render, screen } from '@testing-library/react';
import { PersonalIbanConfirmationPrompt } from '../components/payment/personal-iban-confirmation';
import de from '../translations/languages/de.json';
import fr from '../translations/languages/fr.json';
import italian from '../translations/languages/it.json';

type Translation = Record<string, Record<string, string>>;

const locales = {
  de: {
    translations: de as Translation,
    holderAttribution: /Konto[^.]*gehört[^.]*DFX AG/i,
    customerOwnership: /(?:Konto[^.]*gehört[^.]*(?:dir|Ihnen)|dein(?:e[msr]?)? Konto)/i,
  },
  fr: {
    translations: fr as Translation,
    holderAttribution: /compte[^.]*appartient[^.]*DFX AG/i,
    customerOwnership: /(?:compte[^.]*vous appartient|votre compte)/i,
  },
  it: {
    translations: italian as Translation,
    holderAttribution: /conto[^.]*appartiene[^.]*DFX AG/i,
    customerOwnership: /(?:conto[^.]*ti appartiene|tuo conto)/i,
  },
};

describe('rendered Bank Frick confirmation ownership', () => {
  afterEach(cleanup);

  it.each(Object.entries(locales))(
    '%s attributes the account to DFX AG, never the customer',
    (_locale, { translations, holderAttribution, customerOwnership }) => {
      mockTranslate.mockImplementation(
        (namespace: string, key: string) =>
          translations[namespace]?.[key] ?? key,
      );

      render(
        <PersonalIbanConfirmationPrompt
          onConfirm={jest.fn()}
          onDecline={jest.fn()}
        />,
      );

      const prompt = screen.getByTestId('prompt');
      expect(prompt).toHaveTextContent('Bank Frick');
      expect(prompt).toHaveTextContent(holderAttribution);
      expect(prompt).not.toHaveTextContent(customerOwnership);
    },
  );
});
