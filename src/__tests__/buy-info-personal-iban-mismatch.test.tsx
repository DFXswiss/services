// Wiring test: when personalIban is set but currency is not EUR, BuyInfoScreen omits
// personalIbanProvider from the quote request AND shows a non-blocking info hint.
// personalIban comes from usePersonalIban() (not useAppParams).

const mockReceiveFor = jest.fn();
const mockUseAppParams = jest.fn();
const mockPersonalIban = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  FiatPaymentMethod: { BANK: 'Bank', INSTANT: 'Instant', CARD: 'Card' },
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
  Utils: { formatAmount: (n: number) => String(n) },
  useAsset: () => ({
    getAsset: (list: any[], name: string) =>
      (list ?? []).find((a: any) => a.name === name) ?? list?.[0],
  }),
  useAssetContext: () => ({
    getAssets: () => [{ name: 'BTC', uniqueName: 'Bitcoin' }],
  }),
  useBuy: () => ({
    currencies: [{ name: 'CHF' }, { name: 'EUR' }],
    receiveFor: mockReceiveFor,
  }),
  useFiat: () => ({
    getCurrency: (list: any[], name: string) =>
      (list ?? []).find((c: any) => c.name === name),
  }),
  useUserContext: () => ({ user: undefined }),
}));

jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { SM: 'sm', LG: 'lg' },
  StyledButton: () => null,
  StyledButtonColor: { STURDY_WHITE: 'sturdy-white' },
  StyledButtonWidth: { MIN: 'min', FULL: 'full' },
  StyledInfoText: ({ children }: any) => <div>{children}</div>,
  StyledLink: ({ children, label }: any) => <div>{label ?? children}</div>,
  StyledLoadingSpinner: () => null,
  StyledVerticalStack: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('src/components/payment/payment-info-buy', () => ({
  PaymentInformationContent: () => null,
}));
jest.mock('src/components/error-hint', () => ({
  ErrorHint: ({ message }: any) => <div data-testid="error-hint">{message}</div>,
}));
jest.mock('src/components/payment/buy-completion', () => ({ BuyCompletion: () => null }));
jest.mock('src/components/quote-error-hint', () => ({
  QuoteErrorHint: ({ error }: any) => <div data-testid="quote-error-hint">{error}</div>,
}));

jest.mock('src/contexts/app-handling.context', () => ({
  CloseType: { BUY: 'buy', SELL: 'sell', SWAP: 'swap', PAYMENT: 'payment', CANCEL: 'cancel' },
  useAppHandlingContext: () => ({ closeServices: jest.fn() }),
}));
jest.mock('src/contexts/layout.context', () => ({
  useLayoutContext: () => ({ scrollToTop: jest.fn() }),
}));
jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({ translate: (_ns: string, key: string) => key }),
}));
jest.mock('src/hooks/app-params.hook', () => ({
  useAppParams: () => mockUseAppParams(),
}));
jest.mock('src/hooks/personal-iban.hook', () => ({
  usePersonalIban: () => mockPersonalIban(),
}));
jest.mock('src/hooks/guard.hook', () => ({
  useAddressGuard: () => undefined,
}));
jest.mock('src/hooks/layout-config.hook', () => ({
  useLayoutOptions: () => undefined,
}));

import { render, screen, waitFor } from '@testing-library/react';
import BuyInfoScreen from 'src/screens/buy-info.screen';

const MISMATCH_HINT =
  'Your requested personal IBAN is only available for EUR bank transfers, so it was not used for this offer.';

function baseAppParams(overrides: Record<string, unknown> = {}) {
  return {
    assetIn: 'CHF',
    assetOut: 'BTC',
    amountIn: '100',
    amountOut: undefined,
    externalTransactionId: undefined,
    availableBlockchains: undefined,
    ...overrides,
  };
}

describe('BuyInfoScreen personal IBAN mismatch hint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPersonalIban.mockReturnValue('Frick');
    mockUseAppParams.mockReturnValue(baseAppParams());
    mockReceiveFor.mockResolvedValue({
      id: 1,
      amount: 100,
      currency: { name: 'CHF' },
      estimatedAmount: 0.01,
      asset: { name: 'BTC' },
      minVolume: 1,
      maxVolume: 10000,
    });
  });

  it('omits personalIbanProvider from the quote request and shows the mismatch hint', async () => {
    render(<BuyInfoScreen />);

    await waitFor(() => {
      expect(mockReceiveFor).toHaveBeenCalled();
    });

    const request = mockReceiveFor.mock.calls[0][0];
    expect(request.personalIbanProvider).toBeUndefined();
    expect(request).not.toHaveProperty('personalIbanProvider');

    await waitFor(() => {
      expect(screen.getByText(MISMATCH_HINT)).toBeInTheDocument();
    });
  });

  it('does not show the mismatch hint for customers without personal-iban', async () => {
    mockPersonalIban.mockReturnValue(undefined);

    render(<BuyInfoScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled());
    expect(mockReceiveFor.mock.calls[0][0]).not.toHaveProperty('personalIbanProvider');
    expect(screen.queryByText(MISMATCH_HINT)).not.toBeInTheDocument();
  });

  it('does not show the mismatch hint while paymentInfo is absent (loading)', async () => {
    mockReceiveFor.mockReturnValue(new Promise(() => {}));

    render(<BuyInfoScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled());
    expect(screen.queryByText(MISMATCH_HINT)).not.toBeInTheDocument();
  });

  // buy-info has no separate live form currency state distinct from its fetch inputs
  // (assetIn/currency come from URL params and drive the single fetch). The hint reads
  // paymentInfo.currency after that fetch — this test confirms the hint appears for the
  // displayed CHF offer (and is already covered by the sibling loading/absent cases above
  // for the "no paymentInfo → no hint" half).
  it('shows the mismatch hint for the displayed CHF paymentInfo offer', async () => {
    render(<BuyInfoScreen />);

    await waitFor(() => expect(screen.getByText(MISMATCH_HINT)).toBeInTheDocument());
    const request = mockReceiveFor.mock.calls[0][0];
    expect(request.currency?.name).toBe('CHF');
  });

  it('uses generic KYC path for EUR bank transfer without personal-iban selector (KycRequired)', async () => {
    mockPersonalIban.mockReturnValue(undefined);
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockRejectedValue({ message: 'KycRequired' });

    render(<BuyInfoScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled());
    expect(mockReceiveFor.mock.calls[0][0]).not.toHaveProperty('personalIbanProvider');

    await waitFor(() => expect(screen.getByTestId('quote-error-hint')).toHaveTextContent('KycRequired'));
    expect(screen.queryByText('Personal IBANs require KYC level 50.')).not.toBeInTheDocument();
  });

  it('uses generic path for EUR bank transfer without personal-iban selector (PaymentMethodNotAllowed)', async () => {
    mockPersonalIban.mockReturnValue(undefined);
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockRejectedValue({ message: 'PaymentMethodNotAllowed' });

    render(<BuyInfoScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled());

    await waitFor(() =>
      expect(screen.getByTestId('quote-error-hint')).toHaveTextContent('PaymentMethodNotAllowed'),
    );
    expect(
      screen.queryByText('Personal IBANs require the bank transfer payment method.'),
    ).not.toBeInTheDocument();
  });

  it('keeps personal-IBAN KYC wording when selector is set and server returns KycRequired', async () => {
    mockPersonalIban.mockReturnValue('Frick');
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockRejectedValue({ message: 'KycRequired' });

    render(<BuyInfoScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled());
    expect(mockReceiveFor.mock.calls[0][0].personalIbanProvider).toBe('Frick');

    await waitFor(() =>
      expect(screen.getByText('Personal IBANs require KYC level 50.')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('quote-error-hint')).not.toBeInTheDocument();
  });
});
