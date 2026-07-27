// Wiring test: BuyScreen personal-IBAN mismatch acknowledgement, Frick validation,
// KYC routing, and live-input quote invalidation.
// Mounts the real default-exported BuyScreen (react-hook-form runs for real;
// quote fetch is gated by useDebounce(validatedData, 500) — use generous waitFor).
// personalIban comes from usePersonalIban() (not useAppParams).

const mockReceiveFor = jest.fn();
const mockUseAppParams = jest.fn();
const mockPersonalIban = jest.fn();
const mockSetParams = jest.fn();

const mockAssets = [
  { name: 'BTC', uniqueName: 'Bitcoin', category: 'Public', blockchain: 'Ethereum', description: 'Bitcoin' },
];
const mockAssetsMap = new Map([['Ethereum', mockAssets]]);
const mockGetAssets = () => mockAssets;
const mockGetAsset = (list: any[], name: string) =>
  (list ?? []).find((a: any) => a.name === name) ?? list?.[0];
const mockIsSameAsset = () => false;
const mockGetCurrency = (list: any[], name: string) => (list ?? []).find((c: any) => c.name === name);
const mockGetDefaultCurrency = (list: any[]) => list?.[0];
const mockCurrencies = [
  { name: 'EUR', sellable: true },
  { name: 'CHF', sellable: true },
];
// Stable reference: buy.screen currency-selection effect depends on prefCurrency by identity.
const mockPrefCurrency = { name: 'CHF' };

jest.mock('@dfx.swiss/react', () => ({
  AssetCategory: { PUBLIC: 'Public', PRIVATE: 'Private' },
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
  Utils: { formatAmount: (n: number) => String(n), createRules: () => ({}) },
  Validations: { Required: undefined },
  useAsset: () => ({
    getAsset: mockGetAsset,
    isSameAsset: mockIsSameAsset,
  }),
  useAssetContext: () => ({
    assets: mockAssetsMap,
    getAssets: mockGetAssets,
  }),
  useAuthContext: () => ({ session: undefined }),
  useBuy: () => ({
    currencies: mockCurrencies,
    receiveFor: mockReceiveFor,
    confirmFor: jest.fn(),
  }),
  useFiat: () => ({
    toSymbol: () => '',
    toDescription: () => '',
    getCurrency: mockGetCurrency,
    getDefaultCurrency: mockGetDefaultCurrency,
  }),
  useSessionContext: () => ({ logout: jest.fn() }),
  useUserContext: () => ({ user: undefined }),
}));

jest.mock('@dfx.swiss/react-components', () => {
  const React = require('react');
  const { Controller } = require('react-hook-form');

  // Mirror the real Form: inject `control` into descendants that declare `name`.
  function enrich(elements: any, control: any): any {
    if (!elements) return elements;
    return React.Children.map(elements, (element: any) => {
      if (!React.isValidElement(element)) return element;
      const props: any = element.props;
      const newChildren = enrich(props.children, control);
      if (props.name) {
        return React.cloneElement(element, { control, children: newChildren });
      }
      return React.cloneElement(element, { children: newChildren });
    });
  }

  return {
    AssetIconVariant: {},
    Form: ({ children, control }: any) => <div>{enrich(children, control)}</div>,
    IconColor: { BLUE: 'blue' },
    SpinnerSize: { SM: 'sm', LG: 'lg' },
    StyledButton: ({ label, onClick }: any) => (
      <button type="button" onClick={onClick}>
        {label}
      </button>
    ),
    StyledButtonColor: { STURDY_WHITE: 'sturdy-white' },
    StyledButtonWidth: { MIN: 'min', FULL: 'full' },
    StyledDropdown: ({ name, items, labelFunc, control }: any) => (
      <Controller
        name={name}
        control={control}
        render={({ field }: any) => (
          <div data-testid={`dropdown-${name}`}>
            {(items ?? []).map((item: any) => (
              <button
                key={labelFunc(item)}
                type="button"
                data-testid={`select-${name}-${labelFunc(item)}`}
                onClick={() => field.onChange(item)}
              >
                {labelFunc(item)}
              </button>
            ))}
          </div>
        )}
      />
    ),
    StyledHorizontalStack: ({ children }: any) => <div>{children}</div>,
    StyledInfoText: ({ children }: any) => <div>{children}</div>,
    StyledInput: ({ name, control }: any) => (
      <Controller
        name={name}
        control={control}
        render={({ field }: any) => (
          <input
            data-testid={`input-${name}`}
            value={field.value === undefined ? '' : field.value}
            onChange={field.onChange}
          />
        )}
      />
    ),
    StyledLink: ({ children, label }: any) => <div>{label ?? children}</div>,
    StyledLoadingSpinner: () => <div data-testid="loading-spinner" />,
    StyledSearchDropdown: () => null,
    StyledVerticalStack: ({ children }: any) => <div>{children}</div>,
  };
});

jest.mock('src/components/payment/payment-info-buy', () => ({
  PaymentInformationContent: ({ showBank }: any) => (
    <div data-testid="payment-info" data-show-bank={showBank ? 'true' : 'false'} />
  ),
}));
jest.mock('../components/edit/name.edit', () => ({ NameEdit: () => null }));
jest.mock('../components/error-hint', () => ({
  ErrorHint: ({ message }: any) => <div data-testid="error-hint">{message}</div>,
}));
jest.mock('../components/exchange-rate', () => ({ ExchangeRate: () => <div data-testid="exchange-rate" /> }));
jest.mock('../components/payment/address-switch', () => ({ AddressSwitch: () => null }));
jest.mock('../components/payment/buy-completion', () => ({ BuyCompletion: () => null }));
jest.mock('../components/private-asset-hint', () => ({ PrivateAssetHint: () => null }));
jest.mock('../components/quote-error-hint', () => ({
  QuoteErrorHint: ({ error, message }: any) => (
    <div data-testid="quote-error-hint">
      <span data-testid="quote-error-code">{error}</span>
      {message && <span data-testid="quote-error-message">{message}</span>}
    </div>
  ),
}));
jest.mock('../components/sanction-hint', () => ({ SanctionHint: () => null }));

// labels.ts pulls many runtime enums from @dfx.swiss/react at module load; mock the only
// export BuyScreen uses so we do not need a full enum surface.
jest.mock('../config/labels', () => ({
  addressLabel: (wallet: any) => wallet?.address ?? '',
}));

jest.mock('../contexts/app-handling.context', () => ({
  useAppHandlingContext: () => ({ isInitialized: true }),
}));
jest.mock('../contexts/layout.context', () => ({
  useLayoutContext: () => ({ scrollToTop: jest.fn(), rootRef: { current: null } }),
}));
// prefCurrency must be truthy: currency effect only calls setVal when prefCurrency && currency.
jest.mock('../contexts/settings.context', () => ({
  useSettingsContext: () => ({
    translate: (_ns: string, key: string) => key,
    translateError: (key: string) => key,
    currency: mockPrefCurrency,
  }),
}));
jest.mock('../contexts/wallet.context', () => ({
  useWalletContext: () => ({ blockchain: undefined, switchBlockchain: jest.fn() }),
}));
jest.mock('src/contexts/window.context', () => ({
  useWindowContext: () => ({ width: 800 }),
}));
jest.mock('../hooks/app-params.hook', () => ({
  useAppParams: () => mockUseAppParams(),
}));
jest.mock('../hooks/personal-iban.hook', () => ({
  usePersonalIban: () => mockPersonalIban(),
}));
jest.mock('../hooks/blockchain.hook', () => ({
  useBlockchain: () => ({ toString: () => '' }),
}));
jest.mock('../hooks/guard.hook', () => ({
  useAddressGuard: () => undefined,
}));
jest.mock('../hooks/layout-config.hook', () => ({
  useLayoutOptions: () => undefined,
}));
jest.mock('../hooks/navigation.hook', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FiatPaymentMethod } from '@dfx.swiss/react';
import BuyScreen from 'src/screens/buy.screen';
import { isPersonalIbanApplicable } from '../util/personal-iban';

function baseAppParams(overrides: Record<string, unknown> = {}) {
  return {
    assets: undefined,
    assetIn: 'CHF',
    assetOut: 'BTC',
    amountIn: undefined,
    amountOut: undefined,
    blockchain: undefined,
    paymentMethod: undefined,
    externalTransactionId: undefined,
    flags: undefined,
    setParams: mockSetParams,
    hideTargetSelection: true,
    availableBlockchains: [],
    ...overrides,
  };
}

const MISMATCH_HINT =
  'Your requested personal IBAN is only available for EUR bank transfers, so it was not used for this offer.';
const CONTINUE_WITHOUT = 'Continue without personal IBAN';
const VERIFY_HINT =
  'The personal IBAN response could not be verified for this offer. You can continue with the standard payment details, or cancel.';
const TRANSFER_BUTTON = 'Click here once you have issued the transfer';

function chfOffer() {
  return {
    id: 1,
    amount: 300,
    currency: { name: 'CHF' },
    estimatedAmount: 0.01,
    asset: { name: 'BTC', uniqueName: 'Bitcoin' },
    minVolume: 1,
    maxVolume: 100000,
    isValid: true,
    exchangeRate: 1,
    rate: 1,
    fees: {},
    priceSteps: [],
    isPersonalIban: false,
    name: 'DFX AG',
  };
}

function frickOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: 2,
    amount: 300,
    currency: { name: 'EUR' },
    estimatedAmount: 0.01,
    asset: { name: 'BTC', uniqueName: 'Bitcoin' },
    minVolume: 1,
    maxVolume: 100000,
    isValid: true,
    exchangeRate: 1,
    rate: 1,
    fees: {},
    priceSteps: [],
    isPersonalIban: true,
    bank: 'Bank Frick',
    name: 'DFX AG',
    iban: 'LI21088110102979K002E',
    bic: 'BFRILI22',
    remittanceInfo: 'DFX-BUY-2',
    ...overrides,
  };
}

function ordinaryEurOffer() {
  return frickOffer({
    isPersonalIban: false,
    bank: undefined,
    name: 'DFX AG',
    remittanceInfo: 'DFX-BUY-ORD',
  });
}

describe('BuyScreen personal IBAN mismatch and error handling', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPersonalIban.mockReturnValue('Frick');
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
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('omits personalIbanProvider and requires continue acknowledgement before payment details (A2)', async () => {
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'CHF' }));
    mockReceiveFor.mockResolvedValue(chfOffer());

    render(<BuyScreen />);

    await waitFor(() => expect(screen.getByText(MISMATCH_HINT)).toBeInTheDocument(), { timeout: 3000 });
    await settle();

    const request = mockReceiveFor.mock.calls[0][0];
    expect(request.personalIbanProvider).toBeUndefined();
    expect(request).not.toHaveProperty('personalIbanProvider');
    expect(screen.queryByTestId('payment-info')).not.toBeInTheDocument();
    expect(screen.queryByText(TRANSFER_BUTTON)).not.toBeInTheDocument();

    await act(async () => {
      screen.getByRole('button', { name: CONTINUE_WITHOUT }).click();
    });

    await waitFor(() => expect(screen.getByTestId('payment-info')).toBeInTheDocument());
    expect(screen.getByText(TRANSFER_BUTTON)).toBeInTheDocument();
  });

  it('does not show the mismatch hint or personal-IBAN promo for customers without personal-iban', async () => {
    mockPersonalIban.mockReturnValue(undefined);
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'CHF' }));
    mockReceiveFor.mockResolvedValue(chfOffer());

    render(<BuyScreen />);

    await waitFor(() => expect(screen.getByTestId('payment-info')).toBeInTheDocument(), { timeout: 3000 });
    await settle();
    expect(screen.queryByText(MISMATCH_HINT)).not.toBeInTheDocument();
    expect(mockReceiveFor.mock.calls[0][0]).not.toHaveProperty('personalIbanProvider');
    expect(screen.getByTestId('payment-info')).toHaveAttribute('data-show-bank', 'false');
  });

  it('does not flash the mismatch hint while a quote is still loading (no paymentInfo)', async () => {
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'CHF' }));
    // Never resolve: paymentInfo stays undefined for the whole test.
    mockReceiveFor.mockReturnValue(new Promise(() => {}));

    render(<BuyScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled(), { timeout: 3000 });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(screen.queryByText(MISMATCH_HINT)).not.toBeInTheDocument();
  });

  it('clears the displayed CHF offer immediately when the live form currency changes (B4)', async () => {
    // No selector: no acknowledgement gate can hide payment-info for unrelated reasons.
    // Without immediate invalidation, the CHF offer would stay actionable during the 500ms debounce.
    mockPersonalIban.mockReturnValue(undefined);
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'CHF' }));
    mockReceiveFor.mockResolvedValue(chfOffer());

    render(<BuyScreen />);

    await waitFor(() => expect(screen.getByTestId('payment-info')).toBeInTheDocument(), { timeout: 3000 });
    await settle();
    expect(screen.getByText(TRANSFER_BUTTON)).toBeInTheDocument();

    // Subsequent quote fetch must not resolve — keeps any new offer from landing.
    mockReceiveFor.mockReturnValue(new Promise(() => {}));

    await act(async () => {
      screen.getByTestId('select-currency-EUR').click();
    });

    // Live inputs changed: quote must be cleared immediately, not after 500ms debounce.
    expect(screen.queryByTestId('payment-info')).not.toBeInTheDocument();
    expect(screen.queryByText(TRANSFER_BUTTON)).not.toBeInTheDocument();
  });

  it('discards a pending quote when the customer clears the only amount', async () => {
    mockPersonalIban.mockReturnValue(undefined);
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'CHF' }));

    let resolveQuote!: (offer: ReturnType<typeof chfOffer>) => void;
    const pendingQuote = new Promise<ReturnType<typeof chfOffer>>((resolve) => {
      resolveQuote = resolve;
    });
    const pendingExactPrice = new Promise(() => {});
    mockReceiveFor.mockImplementation(() =>
      mockReceiveFor.mock.calls.length === 1 ? pendingQuote : pendingExactPrice,
    );

    render(<BuyScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled(), { timeout: 3000 });
    expect(screen.getByTestId('input-amount')).toHaveValue('300');
    expect(screen.getByTestId('input-targetAmount')).toHaveValue('');

    await act(async () => {
      fireEvent.change(screen.getByTestId('input-amount'), { target: { value: '' } });
    });
    expect(screen.getByTestId('input-amount')).toHaveValue('');

    await act(async () => {
      resolveQuote(chfOffer());
      await Promise.resolve();
    });

    expect(screen.queryByTestId('payment-info')).not.toBeInTheDocument();
    expect(screen.queryByText(TRANSFER_BUTTON)).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('treats EUR with non-BANK payment methods as a personal-IBAN mismatch (payment-method half)', () => {
    expect(isPersonalIbanApplicable('EUR', FiatPaymentMethod.INSTANT)).toBe(false);
    expect(isPersonalIbanApplicable('EUR', FiatPaymentMethod.CARD)).toBe(false);
    expect(isPersonalIbanApplicable('EUR', FiatPaymentMethod.BANK)).toBe(true);
  });

  it('shows a translated error when the personal IBAN request fails to issue', async () => {
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockRejectedValue({ message: 'PersonalIbanIssuanceFailed' });

    render(<BuyScreen />);

    await waitFor(
      () =>
        expect(
          screen.getByText(
            'We could not issue your personal IBAN. Please try again later or contact support if the problem persists.',
          ),
        ).toBeInTheDocument(),
      { timeout: 3000 },
    );
    await settle();
    expect(mockReceiveFor.mock.calls[0][0].personalIbanProvider).toBe('Frick');
    // Transient issuance failure keeps Retry (A3).
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('uses generic KYC path for EUR bank transfer without personal-iban selector (KycRequired)', async () => {
    mockPersonalIban.mockReturnValue(undefined);
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockRejectedValue({ message: 'KycRequired' });

    render(<BuyScreen />);

    await waitFor(() => expect(screen.getByTestId('quote-error-hint')).toBeInTheDocument(), {
      timeout: 3000,
    });
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

    render(<BuyScreen />);

    await waitFor(
      () => expect(screen.getByTestId('quote-error-hint')).toHaveTextContent('PaymentMethodNotAllowed'),
      { timeout: 3000 },
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

    render(<BuyScreen />);

    await waitFor(() => expect(screen.getByTestId('quote-error-hint')).toBeInTheDocument(), {
      timeout: 3000,
    });
    await settle();
    expect(mockReceiveFor.mock.calls[0][0].personalIbanProvider).toBe('Frick');
    expect(screen.getByTestId('quote-error-code')).toHaveTextContent('KycRequired');
    expect(screen.getByTestId('quote-error-message')).toHaveTextContent(
      'Personal IBANs require KYC level 50.',
    );
    // Must not dead-end on ErrorHint + Retry only.
    expect(screen.queryByTestId('error-hint')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('requires acknowledgement when a Frick request gets ordinary payment details (B1/C1)', async () => {
    mockPersonalIban.mockReturnValue('Frick');
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockResolvedValue(ordinaryEurOffer());

    render(<BuyScreen />);

    await waitFor(() => expect(screen.getByText(VERIFY_HINT)).toBeInTheDocument(), { timeout: 3000 });
    await settle();
    expect(mockReceiveFor.mock.calls[0][0].personalIbanProvider).toBe('Frick');
    expect(screen.queryByTestId('payment-info')).not.toBeInTheDocument();
    expect(screen.queryByText(TRANSFER_BUTTON)).not.toBeInTheDocument();

    await act(async () => {
      screen.getByRole('button', { name: CONTINUE_WITHOUT }).click();
    });

    await waitFor(() => expect(screen.getByTestId('payment-info')).toBeInTheDocument());
    expect(screen.getByTestId('payment-info')).toHaveAttribute('data-show-bank', 'false');
    expect(screen.getByText(TRANSFER_BUTTON)).toBeInTheDocument();
  });

  it('shows Bank row flag for a verified Frick response without acknowledgement (B5)', async () => {
    mockPersonalIban.mockReturnValue('Frick');
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockResolvedValue(frickOffer());

    render(<BuyScreen />);

    await waitFor(() => expect(screen.getByTestId('payment-info')).toBeInTheDocument(), { timeout: 3000 });
    await settle();
    expect(screen.getByTestId('payment-info')).toHaveAttribute('data-show-bank', 'true');
    expect(screen.queryByText(VERIFY_HINT)).not.toBeInTheDocument();
    expect(screen.queryByText(CONTINUE_WITHOUT)).not.toBeInTheDocument();
  });

  it('offers continue-without for an unrecognized selector instead of Retry-only (A3)', async () => {
    mockPersonalIban.mockReturnValue('unknown-provider');
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockResolvedValue(ordinaryEurOffer());

    render(<BuyScreen />);

    await waitFor(() =>
      expect(screen.getByText('The requested personal IBAN provider is not recognized.')).toBeInTheDocument(),
    );
    await settle();
    expect(screen.getByRole('button', { name: CONTINUE_WITHOUT })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    // No request with the unrecognized selector.
    expect(mockReceiveFor).not.toHaveBeenCalled();

    await act(async () => {
      screen.getByRole('button', { name: CONTINUE_WITHOUT }).click();
    });

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled(), { timeout: 3000 });
    await settle();
    expect(mockReceiveFor.mock.calls[0][0]).not.toHaveProperty('personalIbanProvider');
    await waitFor(() => expect(screen.getByTestId('payment-info')).toBeInTheDocument());
    expect(screen.queryByText('The requested personal IBAN provider is not recognized.')).not.toBeInTheDocument();
    expect(screen.getByText(TRANSFER_BUTTON)).toBeInTheDocument();
  });
});
