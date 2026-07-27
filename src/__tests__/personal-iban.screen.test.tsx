// Currency-conditional success copy and fail-loud missing-currency on PersonalIbanScreen.
// EUR (Bank Frick) must never claim "in your own name"; CHF (Yapeal) keeps the legacy claim;
// missing ?currency must error without calling createPersonalIban (no silent EUR default).

jest.mock('@dfx.swiss/react', () => ({}));

jest.mock('@dfx.swiss/react-components', () => ({
  IconColor: { BLUE: 'blue' },
  SpinnerSize: { LG: 'lg' },
  StyledButtonColor: { STURDY_WHITE: 'sturdy-white' },
  StyledButtonWidth: { FULL: 'full' },
  StyledButton: ({ label, onClick }: { label: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
  StyledInfoText: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="styled-info-text">{children}</div>
  ),
  StyledLoadingSpinner: () => <div data-testid="loading-spinner" />,
  StyledVerticalStack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../components/error-hint', () => ({
  ErrorHint: ({ message }: { message: string }) => <div data-testid="error-hint">{message}</div>,
}));

jest.mock('../hooks/guard.hook', () => ({
  useAddressGuard: () => undefined,
}));

jest.mock('../contexts/settings.context', () => ({
  useSettingsContext: () => ({
    translate: (_ns: string, key: string, interpolation?: Record<string, string | number>) => {
      if (!interpolation) return key;
      return Object.entries(interpolation).reduce(
        (text, [k, v]) => text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v)),
        key,
      );
    },
  }),
}));

jest.mock('../hooks/layout-config.hook', () => ({
  useLayoutOptions: () => undefined,
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('../hooks/navigation.hook', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

const mockCreatePersonalIban = jest.fn();
jest.mock('../hooks/virtual-iban.hook', () => ({
  __esModule: true,
  default: () => ({ createPersonalIban: mockCreatePersonalIban }),
}));

import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import PersonalIbanScreen from '../screens/personal-iban.screen';

const OWN_NAME_SUCCESS =
  'Your personal IBAN for CHF transactions is now available. Future bank transfers will be made to this IBAN in your own name.';

const EUR_DEDICATED_SUCCESS =
  'Your personal IBAN for EUR transactions is now available. Future bank transfers will be made to this dedicated IBAN, which is assigned only to you.';

const MISSING_CURRENCY =
  'No currency specified. Please go back and select a currency.';

const MOCK_IBAN = {
  id: 1,
  iban: 'CH9300762011623852957',
  currency: 'CHF',
  active: true,
};

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '/buy/personal-iban', element: <PersonalIbanScreen /> }], {
    initialEntries: [path],
  });
  return render(<RouterProvider router={router} />);
}

describe('PersonalIbanScreen currency copy and missing-currency fail-loud', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatePersonalIban.mockResolvedValue(MOCK_IBAN);
  });

  it('CHF: shows the legacy "in your own name" success text byte-identically and does not show missing-currency error', async () => {
    renderAt('/buy/personal-iban?currency=CHF');

    await waitFor(() => {
      expect(screen.getByText(OWN_NAME_SUCCESS)).toBeInTheDocument();
    });

    expect(mockCreatePersonalIban).toHaveBeenCalledWith({ currency: 'CHF' });
    expect(screen.queryByText(MISSING_CURRENCY)).not.toBeInTheDocument();
    expect(screen.queryByTestId('error-hint')).not.toBeInTheDocument();
    expect(screen.queryByText(/dedicated IBAN/)).not.toBeInTheDocument();
  });

  it('EUR: does not claim "in your own name"; shows dedicated-IBAN wording instead', async () => {
    mockCreatePersonalIban.mockResolvedValue({ ...MOCK_IBAN, currency: 'EUR', iban: 'LI21088100002324013AA' });
    renderAt('/buy/personal-iban?currency=EUR');

    await waitFor(() => {
      expect(screen.getByText(EUR_DEDICATED_SUCCESS)).toBeInTheDocument();
    });

    expect(mockCreatePersonalIban).toHaveBeenCalledWith({ currency: 'EUR' });
    expect(screen.queryByText(/in your own name/)).not.toBeInTheDocument();
    expect(screen.queryByText(MISSING_CURRENCY)).not.toBeInTheDocument();
  });

  it('missing currency: fails loudly, does not call createPersonalIban, never claims "in your own name"', async () => {
    renderAt('/buy/personal-iban');

    await waitFor(() => {
      expect(screen.getByTestId('error-hint')).toHaveTextContent(MISSING_CURRENCY);
    });

    expect(mockCreatePersonalIban).not.toHaveBeenCalled();
    expect(screen.queryByText(/in your own name/)).not.toBeInTheDocument();
    expect(screen.queryByText(/dedicated IBAN/)).not.toBeInTheDocument();
  });
});
