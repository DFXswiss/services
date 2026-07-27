// Wiring test: when personalIban is set but currency is not EUR, BuyInfoScreen omits
// personalIbanProvider from the quote request AND requires continue acknowledgement (A2).
// personalIban comes from usePersonalIban() (not useAppParams).

const mockReceiveFor = jest.fn();
const mockUseAppParams = jest.fn();
const mockPersonalIban = jest.fn();
const mockCloseServices = jest.fn();

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
  PaymentInformationContent: ({ showBank }: any) => (
    <div data-testid="payment-info" data-show-bank={showBank ? 'true' : 'false'} />
  ),
}));
jest.mock('src/components/error-hint', () => ({
  ErrorHint: ({ message }: any) => <div data-testid="error-hint">{message}</div>,
}));
jest.mock('src/components/payment/buy-completion', () => ({ BuyCompletion: () => null }));
jest.mock('src/components/quote-error-hint', () => ({
  QuoteErrorHint: ({ error, message }: any) => (
    <div data-testid="quote-error-hint">
      <span data-testid="quote-error-code">{error}</span>
      {message && <span data-testid="quote-error-message">{message}</span>}
    </div>
  ),
}));

jest.mock('src/contexts/app-handling.context', () => ({
  CloseType: { BUY: 'buy', SELL: 'sell', SWAP: 'swap', PAYMENT: 'payment', CANCEL: 'cancel' },
  useAppHandlingContext: () => ({ closeServices: mockCloseServices }),
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

import { act, render, screen, waitFor } from '@testing-library/react';
import BuyInfoScreen from 'src/screens/buy-info.screen';

const MISMATCH_HINT =
  'Your requested personal IBAN is only available for EUR bank transfers, so it was not used for this offer.';
const CONTINUE_WITHOUT = 'Continue without personal IBAN';
const VERIFY_HINT =
  'The personal IBAN response could not be verified for this offer. You can continue with the standard payment details, or cancel.';
const TRANSFER_BUTTON = 'Click here once you have issued the transfer';

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

function chfOffer() {
  return {
    id: 1,
    amount: 100,
    currency: { name: 'CHF' },
    estimatedAmount: 0.01,
    asset: { name: 'BTC' },
    minVolume: 1,
    maxVolume: 10000,
    isPersonalIban: false,
    name: 'DFX AG',
  };
}

function frickOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: 2,
    amount: 100,
    currency: { name: 'EUR' },
    estimatedAmount: 0.01,
    asset: { name: 'BTC' },
    minVolume: 1,
    maxVolume: 10000,
    isPersonalIban: true,
    bank: 'Bank Frick',
    name: 'DFX AG',
    ...overrides,
  };
}

describe('BuyInfoScreen personal IBAN mismatch hint', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPersonalIban.mockReturnValue('Frick');
    mockUseAppParams.mockReturnValue(baseAppParams());
    mockReceiveFor.mockResolvedValue(chfOffer());
    // A6: fail on unexpected act() / React warnings so terminal state is awaited properly.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      const msg = String(args[0] ?? '');
      if (msg.includes('not wrapped in act') || msg.includes('Warning: An update to')) {
        throw new Error(`Unexpected console.error in test: ${msg}`);
      }
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  async function settle() {
    // Drain microtasks so promise.finally loading updates settle under act (A6).
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('omits personalIbanProvider and requires continue acknowledgement before payment details (A2)', async () => {
    render(<BuyInfoScreen />);

    await waitFor(() => {
      expect(mockReceiveFor).toHaveBeenCalled();
    });
    await settle();

    const request = mockReceiveFor.mock.calls[0][0];
    expect(request.personalIbanProvider).toBeUndefined();
    expect(request).not.toHaveProperty('personalIbanProvider');

    await waitFor(() => {
      expect(screen.getByText(MISMATCH_HINT)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('payment-info')).not.toBeInTheDocument();
    expect(screen.queryByText(TRANSFER_BUTTON)).not.toBeInTheDocument();

    await act(async () => {
      screen.getByRole('button', { name: CONTINUE_WITHOUT }).click();
    });

    await waitFor(() => expect(screen.getByTestId('payment-info')).toBeInTheDocument());
    expect(screen.getByText(TRANSFER_BUTTON)).toBeInTheDocument();
  });

  it('does not show the mismatch hint for customers without personal-iban', async () => {
    mockPersonalIban.mockReturnValue(undefined);

    render(<BuyInfoScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled());
    await settle();
    expect(mockReceiveFor.mock.calls[0][0]).not.toHaveProperty('personalIbanProvider');
    await waitFor(() => expect(screen.getByTestId('payment-info')).toBeInTheDocument());
    expect(screen.queryByText(MISMATCH_HINT)).not.toBeInTheDocument();
    expect(screen.getByTestId('payment-info')).toHaveAttribute('data-show-bank', 'false');
  });

  it('does not show the mismatch hint while paymentInfo is absent (loading)', async () => {
    mockReceiveFor.mockReturnValue(new Promise(() => {}));

    render(<BuyInfoScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled());
    await settle();
    expect(screen.queryByText(MISMATCH_HINT)).not.toBeInTheDocument();
  });

  it('uses generic KYC path for EUR bank transfer without personal-iban selector (KycRequired)', async () => {
    mockPersonalIban.mockReturnValue(undefined);
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockRejectedValue({ message: 'KycRequired' });

    render(<BuyInfoScreen />);

    await waitFor(() => expect(screen.getByTestId('quote-error-hint')).toBeInTheDocument());
    await settle();
    expect(mockReceiveFor.mock.calls[0][0]).not.toHaveProperty('personalIbanProvider');
    expect(screen.getByTestId('quote-error-code')).toHaveTextContent('KycRequired');
    expect(screen.queryByTestId('quote-error-message')).not.toBeInTheDocument();
    expect(screen.queryByText('Personal IBANs require KYC level 50.')).not.toBeInTheDocument();
  });

  it('uses generic path for EUR bank transfer without personal-iban selector (PaymentMethodNotAllowed)', async () => {
    mockPersonalIban.mockReturnValue(undefined);
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockRejectedValue({ message: 'PaymentMethodNotAllowed' });

    render(<BuyInfoScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('quote-error-hint')).toHaveTextContent('PaymentMethodNotAllowed'),
    );
    await settle();
    expect(
      screen.queryByText('Personal IBANs require the bank transfer payment method.'),
    ).not.toBeInTheDocument();
  });

  it('routes personal-IBAN KycRequired through QuoteErrorHint with feature explanation (A3/B3)', async () => {
    mockPersonalIban.mockReturnValue('Frick');
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockRejectedValue({ message: 'KycRequired' });

    render(<BuyInfoScreen />);

    await waitFor(() => expect(screen.getByTestId('quote-error-hint')).toBeInTheDocument());
    await settle();
    expect(mockReceiveFor.mock.calls[0][0].personalIbanProvider).toBe('Frick');
    expect(screen.getByTestId('quote-error-code')).toHaveTextContent('KycRequired');
    expect(screen.getByTestId('quote-error-message')).toHaveTextContent(
      'Personal IBANs require KYC level 50.',
    );
    expect(screen.queryByTestId('error-hint')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('requires acknowledgement when a Frick request gets ordinary payment details (B1/C1)', async () => {
    mockPersonalIban.mockReturnValue('Frick');
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockResolvedValue(
      frickOffer({ isPersonalIban: false, bank: undefined, name: 'DFX AG' }),
    );

    render(<BuyInfoScreen />);

    await waitFor(() => expect(screen.getByText(VERIFY_HINT)).toBeInTheDocument());
    await settle();
    expect(mockReceiveFor.mock.calls[0][0].personalIbanProvider).toBe('Frick');
    expect(screen.queryByTestId('payment-info')).not.toBeInTheDocument();

    await act(async () => {
      screen.getByRole('button', { name: CONTINUE_WITHOUT }).click();
    });

    await waitFor(() => expect(screen.getByTestId('payment-info')).toBeInTheDocument());
    expect(screen.getByTestId('payment-info')).toHaveAttribute('data-show-bank', 'false');
  });

  it('shows verified Frick details immediately with showBank (B5)', async () => {
    mockPersonalIban.mockReturnValue('Frick');
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockResolvedValue(frickOffer());

    render(<BuyInfoScreen />);

    await waitFor(() => expect(screen.getByTestId('payment-info')).toBeInTheDocument());
    await settle();
    expect(screen.getByTestId('payment-info')).toHaveAttribute('data-show-bank', 'true');
    expect(screen.queryByText(CONTINUE_WITHOUT)).not.toBeInTheDocument();
  });

  it('offers continue-without and Close for an unrecognized selector (A3)', async () => {
    mockPersonalIban.mockReturnValue('unknown-provider');
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockResolvedValue(frickOffer({ isPersonalIban: false, bank: undefined }));

    render(<BuyInfoScreen />);

    await waitFor(() =>
      expect(screen.getByText('The requested personal IBAN provider is not recognized.')).toBeInTheDocument(),
    );
    await settle();
    expect(screen.getByRole('button', { name: CONTINUE_WITHOUT })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(mockReceiveFor).not.toHaveBeenCalled();

    await act(async () => {
      screen.getByRole('button', { name: CONTINUE_WITHOUT }).click();
    });

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled());
    await settle();
    expect(mockReceiveFor.mock.calls[0][0]).not.toHaveProperty('personalIbanProvider');
  });
});
