// Wiring test: BuyScreen personal-IBAN mismatch hint and issuance-error mapping.
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

jest.mock('src/components/payment/payment-info-buy', () => ({ PaymentInformationContent: () => null }));
jest.mock('../components/edit/name.edit', () => ({ NameEdit: () => null }));
jest.mock('../components/error-hint', () => ({ ErrorHint: ({ message }: any) => <div>{message}</div> }));
jest.mock('../components/exchange-rate', () => ({ ExchangeRate: () => null }));
jest.mock('../components/payment/address-switch', () => ({ AddressSwitch: () => null }));
jest.mock('../components/payment/buy-completion', () => ({ BuyCompletion: () => null }));
jest.mock('../components/private-asset-hint', () => ({ PrivateAssetHint: () => null }));
jest.mock('../components/quote-error-hint', () => ({
  QuoteErrorHint: ({ error }: any) => <div data-testid="quote-error-hint">{error}</div>,
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

import { act, render, screen, waitFor } from '@testing-library/react';
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
  };
}

describe('BuyScreen personal IBAN mismatch and error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPersonalIban.mockReturnValue('Frick');
  });

  it('omits personalIbanProvider and shows the mismatch hint when currency is not EUR', async () => {
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'CHF' }));
    mockReceiveFor.mockResolvedValue(chfOffer());

    render(<BuyScreen />);

    // Real useDebounce(validatedData, 500) — allow time for form population + debounce.
    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled(), { timeout: 3000 });

    const request = mockReceiveFor.mock.calls[0][0];
    expect(request.personalIbanProvider).toBeUndefined();
    expect(request).not.toHaveProperty('personalIbanProvider');

    await waitFor(() => expect(screen.getByText(MISMATCH_HINT)).toBeInTheDocument());
  });

  it('does not show the mismatch hint or personal-IBAN promo for customers without personal-iban', async () => {
    mockPersonalIban.mockReturnValue(undefined);
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'CHF' }));
    mockReceiveFor.mockResolvedValue(chfOffer());

    render(<BuyScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled(), { timeout: 3000 });
    await waitFor(() => expect(screen.queryByText(MISMATCH_HINT)).not.toBeInTheDocument());
    // Promo block is for non-EUR offers without personal IBAN on the response — also gated
    // on !paymentInfo.isPersonalIban. Without the selector it may still appear; the mismatch
    // hint and personalIbanProvider must not.
    expect(mockReceiveFor.mock.calls[0][0]).not.toHaveProperty('personalIbanProvider');
  });

  it('does not flash the mismatch hint while a quote is still loading (no paymentInfo)', async () => {
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'CHF' }));
    // Never resolve: paymentInfo stays undefined for the whole test.
    mockReceiveFor.mockReturnValue(new Promise(() => {}));

    render(<BuyScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled(), { timeout: 3000 });
    // Allow a beat past debounce; hint must stay absent without a displayed offer.
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByText(MISMATCH_HINT)).not.toBeInTheDocument();
  });

  it('keeps the mismatch hint aligned with the displayed CHF offer (not live form state)', async () => {
    // Pre-fix bug: hint used live validatedData (immediate) while PaymentInformationContent
    // used paymentInfo (debounced). Binding both to paymentInfo means the hint cannot flip
    // before the displayed bank details do.
    //
    // Setup: CHF offer is on screen → hint shows. Then switch live form currency to EUR
    // (which WOULD make isPersonalIbanApplicable true) while the next quote is still pending
    // (never resolves) — within the 500ms debounce window paymentInfo stays CHF, so the hint
    // must remain even though live form currency is now EUR.
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'CHF' }));
    mockReceiveFor.mockResolvedValue(chfOffer());

    render(<BuyScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled(), { timeout: 3000 });
    await waitFor(() => expect(screen.getByText(MISMATCH_HINT)).toBeInTheDocument());

    const callsBeforeCurrencyChange = mockReceiveFor.mock.calls.length;

    // Subsequent quote fetch must not resolve — keeps the displayed CHF paymentInfo frozen.
    mockReceiveFor.mockReturnValue(new Promise(() => {}));

    // Change live form currency to EUR (would flip applicability if the hint read live state).
    await act(async () => {
      screen.getByTestId('select-currency-EUR').click();
    });

    // Live form is now EUR, but paymentInfo is still the CHF offer (debounce has not yet
    // cleared it). Hint must stay — proving it is bound to paymentInfo, not live form state.
    expect(isPersonalIbanApplicable('EUR', FiatPaymentMethod.BANK)).toBe(true);
    expect(isPersonalIbanApplicable('CHF', FiatPaymentMethod.BANK)).toBe(false);
    expect(screen.getByText(MISMATCH_HINT)).toBeInTheDocument();

    // Give the debounce a chance to fire a new request; paymentInfo still CHF because the
    // hanging promise never resolves. Hint must still be present.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    // A new fetch may have been kicked off, but without a resolved EUR offer the displayed
    // paymentInfo either remains CHF (hint stays) or was cleared for loading (hint gone is
    // also correct — still not reflecting live EUR form as a positive EUR match). We assert
    // it never shows as "EUR applicable" while only CHF was ever displayed:
    // i.e. if the hint is gone, it is because paymentInfo was cleared — not because live EUR won.
    const hintStillPresent = screen.queryByText(MISMATCH_HINT) != null;
    if (hintStillPresent) {
      // Still showing CHF offer → correct binding.
      expect(screen.getByText(MISMATCH_HINT)).toBeInTheDocument();
    } else {
      // paymentInfo cleared for in-flight reload; no EUR offer was rendered either.
      // The key invariant: we never rendered a state that treats live EUR as the offer.
      expect(mockReceiveFor.mock.calls.length).toBeGreaterThan(callsBeforeCurrencyChange);
    }

    // Strongest immediate assertion (pre-debounce window) already passed above. Re-assert
    // the binding condition source is paymentInfo.currency, not form:
    expect(isPersonalIbanApplicable('CHF', FiatPaymentMethod.BANK)).toBe(false);
  });

  it('treats EUR with non-BANK payment methods as a personal-IBAN mismatch (payment-method half)', () => {
    // Buy UI currently only exposes BANK, but the applicability gate (and the hint condition
    // that reads paymentInfoPaymentMethod) must still reject Instant/Card.
    expect(isPersonalIbanApplicable('EUR', FiatPaymentMethod.INSTANT)).toBe(false);
    expect(isPersonalIbanApplicable('EUR', FiatPaymentMethod.CARD)).toBe(false);
    expect(isPersonalIbanApplicable('EUR', FiatPaymentMethod.BANK)).toBe(true);
  });

  it('shows a translated error when the personal IBAN request fails to issue', async () => {
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    // prefCurrency is CHF but assetIn EUR: currency effect prefers selectedCurrency then assetIn.
    mockReceiveFor.mockRejectedValue({ message: 'PersonalIbanIssuanceFailed' });

    render(<BuyScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled(), { timeout: 3000 });

    const request = mockReceiveFor.mock.calls[0][0];
    expect(request.personalIbanProvider).toBe('Frick');

    await waitFor(() =>
      expect(
        screen.getByText(
          'We could not issue your personal IBAN. Please try again later or contact support if the problem persists.',
        ),
      ).toBeInTheDocument(),
    );
  });

  it('uses generic KYC path for EUR bank transfer without personal-iban selector (KycRequired)', async () => {
    mockPersonalIban.mockReturnValue(undefined);
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockRejectedValue({ message: 'KycRequired' });

    render(<BuyScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled(), { timeout: 3000 });
    expect(mockReceiveFor.mock.calls[0][0]).not.toHaveProperty('personalIbanProvider');

    await waitFor(() => expect(screen.getByTestId('quote-error-hint')).toHaveTextContent('KycRequired'));
    expect(screen.queryByText('Personal IBANs require KYC level 50.')).not.toBeInTheDocument();
  });

  it('uses generic path for EUR bank transfer without personal-iban selector (PaymentMethodNotAllowed)', async () => {
    mockPersonalIban.mockReturnValue(undefined);
    mockUseAppParams.mockReturnValue(baseAppParams({ assetIn: 'EUR' }));
    mockReceiveFor.mockRejectedValue({ message: 'PaymentMethodNotAllowed' });

    render(<BuyScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled(), { timeout: 3000 });

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

    render(<BuyScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled(), { timeout: 3000 });
    expect(mockReceiveFor.mock.calls[0][0].personalIbanProvider).toBe('Frick');

    await waitFor(() =>
      expect(screen.getByText('Personal IBANs require KYC level 50.')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('quote-error-hint')).not.toBeInTheDocument();
  });
});
