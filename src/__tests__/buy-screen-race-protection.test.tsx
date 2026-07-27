// Race-protection test: BuyScreen must discard a stale, slower-resolving quote
// when a newer fetch (triggered by personalIban change) already resolved.
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
    StyledButton: () => null,
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
    StyledInput: () => null,
    StyledLink: ({ children, label }: any) => <div>{label ?? children}</div>,
    StyledLoadingSpinner: () => null,
    StyledSearchDropdown: () => null,
    StyledVerticalStack: ({ children }: any) => <div>{children}</div>,
  };
});

jest.mock('src/components/payment/payment-info-buy', () => {
  const React = require('react');
  return {
    PaymentInformationContent: ({ info }: any) => <div data-testid="payment-info">{info.amount}</div>,
  };
});
jest.mock('../components/edit/name.edit', () => ({ NameEdit: () => null }));
jest.mock('../components/error-hint', () => ({ ErrorHint: ({ message }: any) => <div>{message}</div> }));
jest.mock('../components/exchange-rate', () => ({ ExchangeRate: () => null }));
jest.mock('../components/payment/address-switch', () => ({ AddressSwitch: () => null }));
jest.mock('../components/payment/buy-completion', () => ({ BuyCompletion: () => null }));
jest.mock('../components/private-asset-hint', () => ({ PrivateAssetHint: () => null }));
jest.mock('../components/quote-error-hint', () => ({ QuoteErrorHint: () => null }));
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

import { act, render, screen, waitFor } from '@testing-library/react';
import BuyScreen from 'src/screens/buy.screen';

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

describe('BuyScreen quote race protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('discards a stale, slower-resolving quote in favor of a newer, faster one', async () => {
    mockPersonalIban.mockReturnValue(undefined);
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));

    function offerFor(provider: string | undefined) {
      return {
        id: provider === undefined ? 1 : 2,
        amount: provider === undefined ? 111 : 222,
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
      };
    }

    mockReceiveFor.mockImplementation((req: any) => {
      const provider = req.personalIbanProvider;
      const delay = provider === undefined ? 250 : 0;
      return new Promise((resolve) => setTimeout(() => resolve(offerFor(provider)), delay));
    });

    const { rerender } = render(<BuyScreen />);

    // Real 500ms debounce before the first (slow) flight fires.
    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled(), { timeout: 3000 });
    expect(mockReceiveFor.mock.calls[0][0].personalIbanProvider).toBeUndefined();

    // personalIban is NOT itself debounced (only validatedData is) — changing it re-runs the
    // effect immediately with the current validatedData, firing the second (fast) flight
    // before the first (slow) one has resolved.
    mockPersonalIban.mockReturnValue('frick');
    rerender(<BuyScreen />);

    await waitFor(() =>
      expect(mockReceiveFor.mock.calls.some((c: any) => c[0].personalIbanProvider === 'Frick')).toBe(true),
    );

    // The fast flight wins first.
    await waitFor(() => expect(screen.getByTestId('payment-info')).toHaveTextContent('222'), { timeout: 3000 });

    // Give the slow flight (started first, and possibly still issuing its own "exact price"
    // follow-up call) time to fully resolve after the fast one already landed.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });

    // Stale slow data must never overwrite the newer fast data.
    expect(screen.getByTestId('payment-info')).toHaveTextContent('222');
    expect(screen.queryByText('111')).not.toBeInTheDocument();
  });
});
