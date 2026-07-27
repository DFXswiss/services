const mockReceiveFor = jest.fn();
const mockUseAuthContext = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  FiatPaymentMethod: { BANK: 'Bank', INSTANT: 'Instant', CARD: 'Card' },
  PersonalIbanProvider: { FRICK: 'Frick' },
  TransactionError: {
    AMOUNT_TOO_LOW: 'AmountTooLow',
    AMOUNT_TOO_HIGH: 'AmountTooHigh',
    BANK_TRANSACTION_MISSING: 'BankTransactionMissing',
    BANK_TRANSACTION_OR_VIDEO_MISSING: 'BankTransactionOrVideoMissing',
    KYC_REQUIRED: 'KycRequired',
    KYC_DATA_REQUIRED: 'KycDataRequired',
    KYC_REQUIRED_INSTANT: 'KycRequiredInstant',
    LIMIT_EXCEEDED: 'LimitExceeded',
    NATIONALITY_NOT_ALLOWED: 'NationalityNotAllowed',
    PAYMENT_METHOD_NOT_ALLOWED: 'PaymentMethodNotAllowed',
    VIDEO_IDENT_REQUIRED: 'VideoIdentRequired',
    IBAN_CURRENCY_MISMATCH: 'IbanCurrencyMismatch',
    TRADING_NOT_ALLOWED: 'TradingNotAllowed',
    RECOMMENDATION_REQUIRED: 'RecommendationRequired',
    EMAIL_REQUIRED: 'EmailRequired',
  },
  TransactionType: { BUY: 'Buy' },
  Utils: { formatAmount: (value: number) => String(value) },
  useAuthContext: () => mockUseAuthContext(),
  useAsset: () => ({ getAsset: (items: any[]) => items[0] }),
  useAssetContext: () => ({
    getAssets: () => [{ name: 'BTC', uniqueName: 'Bitcoin' }],
  }),
  useBuy: () => ({
    currencies: [{ name: 'EUR' }],
    receiveFor: mockReceiveFor,
  }),
  useFiat: () => ({
    getCurrency: (items: any[]) => items[0],
  }),
  useUserContext: () => ({ user: undefined }),
}));

jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { SM: 'sm', LG: 'lg' },
  StyledButton: ({ label, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
  StyledButtonColor: { STURDY_WHITE: 'sturdy-white' },
  StyledButtonWidth: { MIN: 'min', FULL: 'full' },
  StyledInfoText: ({ children }: any) => <div>{children}</div>,
  StyledLink: ({ children, label }: any) => <div>{label ?? children}</div>,
  StyledLoadingSpinner: () => <div data-testid="loading-spinner" />,
  StyledVerticalStack: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('src/components/payment/payment-info-buy', () => ({
  PaymentInformationContent: ({ info, showBank }: any) => (
    <div data-testid="payment-info" data-show-bank={String(Boolean(showBank))}>
      {info.iban}
    </div>
  ),
}));
jest.mock('src/components/error-hint', () => ({
  ErrorHint: ({ message }: any) => <div>{message}</div>,
}));
jest.mock('src/components/payment/buy-completion', () => ({
  BuyCompletion: () => null,
}));
jest.mock('src/components/quote-error-hint', () => ({
  QuoteErrorHint: () => null,
}));
jest.mock('src/contexts/app-handling.context', () => ({
  CloseType: { BUY: 'buy', CANCEL: 'cancel' },
  useAppHandlingContext: () => ({
    isWidget: false,
    closeServices: jest.fn(),
  }),
}));
jest.mock('src/contexts/layout.context', () => ({
  useLayoutContext: () => ({ scrollToTop: jest.fn() }),
}));
jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({
    translate: (_namespace: string, key: string) => key,
  }),
}));
jest.mock('src/contexts/wallet.context', () => ({
  useWalletContext: () => ({ isInitialized: true }),
}));
jest.mock('src/hooks/app-params.hook', () => ({
  useAppParams: () => ({
    assetIn: 'EUR',
    assetOut: 'BTC',
    amountIn: '100',
    amountOut: undefined,
    externalTransactionId: undefined,
    availableBlockchains: undefined,
  }),
}));
jest.mock('src/hooks/guard.hook', () => ({
  useAddressGuard: () => undefined,
}));
jest.mock('src/hooks/layout-config.hook', () => ({
  useLayoutOptions: () => undefined,
}));

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import BuyInfoScreen from 'src/screens/buy-info.screen';
import { PERSONAL_IBAN_CONFIRMATION_STORAGE_KEY_PREFIX } from 'src/hooks/personal-iban.hook';

const CONFIRM = 'Request and use personal IBAN';
const DECLINE = 'Continue without personal IBAN';
const PROMPT =
  'A personal IBAN is a real, non-revocable account opened for you at a bank. Please confirm whether you want to request and use it.';

function offer(personal: boolean) {
  return {
    id: personal ? 1 : 2,
    amount: 100,
    currency: { name: 'EUR' },
    estimatedAmount: 0.01,
    asset: { name: 'BTC' },
    minVolume: 1,
    maxVolume: 10000,
    isPersonalIban: personal,
    bank: personal ? 'Bank Frick' : undefined,
    name: 'DFX AG',
    iban: personal ? 'LI-PERSONAL' : 'CH-STANDARD',
  };
}

function renderFlow(path = '/buy/info?personal-iban=frick') {
  const router = createMemoryRouter(
    [{ path: '*', element: <BuyInfoScreen /> }],
    { initialEntries: [path] },
  );
  const element = <RouterProvider router={router} />;
  return { element, rendered: render(element) };
}

describe('BuyInfoScreen personal-IBAN confirmation transitions', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    cleanup();
    sessionStorage.clear();
    mockUseAuthContext.mockReturnValue({ session: { account: 201 } });
    mockReceiveFor.mockImplementation(
      (request: { personalIbanProvider?: string }) =>
        Promise.resolve(offer(request.personalIbanProvider === 'Frick')),
    );
  });

  async function settle(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('confirm in the real dialog sends a provider request and shows verified details', async () => {
    renderFlow();

    expect(screen.getByText(PROMPT)).toBeInTheDocument();
    expect(mockReceiveFor).not.toHaveBeenCalled();

    await act(async () => screen.getByRole('button', { name: CONFIRM }).click());

    await waitFor(() =>
      expect(mockReceiveFor).toHaveBeenCalledWith(
        expect.objectContaining({ personalIbanProvider: 'Frick' }),
      ),
    );
    await settle();
    await waitFor(() => expect(screen.getByTestId('payment-info')).toHaveTextContent('LI-PERSONAL'));
    await settle();
    expect(mockReceiveFor).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('payment-info')).toHaveAttribute(
      'data-show-bank',
      'true',
    );
  });

  it('decline in the real dialog sends a fresh selector-free request and shows standard details', async () => {
    renderFlow();

    expect(mockReceiveFor).not.toHaveBeenCalled();
    await act(async () => screen.getByRole('button', { name: DECLINE }).click());

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled());
    expect(mockReceiveFor.mock.calls[0][0]).not.toHaveProperty(
      'personalIbanProvider',
    );
    await waitFor(() =>
      expect(screen.getByTestId('payment-info')).toHaveTextContent('CH-STANDARD'),
    );
    await settle();
    expect(screen.getByTestId('payment-info')).toHaveAttribute(
      'data-show-bank',
      'false',
    );
  });

  it('reload after confirmation skips the dialog and immediately sends the provider request', async () => {
    const { element } = renderFlow();
    await act(async () => screen.getByRole('button', { name: CONFIRM }).click());
    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled());
    await settle();
    cleanup();
    mockReceiveFor.mockClear();

    render(element);

    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(mockReceiveFor).toHaveBeenCalledWith(
        expect.objectContaining({ personalIbanProvider: 'Frick' }),
      ),
    );
    await settle();
  });

  it('unavailable sessionStorage shows the dialog and does not send a quote', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    renderFlow();

    expect(screen.getByText(PROMPT)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your browser could not reliably read or save this choice. You will be asked again after a reload.',
      ),
    ).toBeInTheDocument();
    expect(mockReceiveFor).not.toHaveBeenCalled();
  });

  it('a failed storage write is visible while decline still fetches standard details', async () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    renderFlow();
    await act(async () => screen.getByRole('button', { name: DECLINE }).click());

    await waitFor(() =>
      expect(screen.getByTestId('payment-info')).toHaveTextContent(
        'CH-STANDARD',
      ),
    );
    await settle();
    expect(
      screen.getByText(
        'Your browser could not reliably read or save this choice. You will be asked again after a reload.',
      ),
    ).toBeInTheDocument();
  });

  it('without a selector shows no dialog, touches no confirmation storage, and quotes while authentication is unsettled', async () => {
    mockUseAuthContext.mockReturnValue({ session: undefined });
    const getItem = jest.spyOn(Storage.prototype, 'getItem');
    const setItem = jest.spyOn(Storage.prototype, 'setItem');

    renderFlow('/buy/info');

    expect(screen.queryByText(PROMPT)).not.toBeInTheDocument();
    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled());
    expect(mockReceiveFor.mock.calls[0][0]).not.toHaveProperty(
      'personalIbanProvider',
    );
    expect(
      getItem.mock.calls.some(([key]) =>
        String(key).startsWith(
          PERSONAL_IBAN_CONFIRMATION_STORAGE_KEY_PREFIX,
        ),
      ),
    ).toBe(false);
    expect(
      setItem.mock.calls.some(([key]) =>
        String(key).startsWith(
          PERSONAL_IBAN_CONFIRMATION_STORAGE_KEY_PREFIX,
        ),
      ),
    ).toBe(false);
    await settle();
  });
});
