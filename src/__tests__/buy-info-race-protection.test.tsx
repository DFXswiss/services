// Race-protection test: BuyInfoScreen must discard a stale, slower-resolving quote
// when a newer fetch (triggered by personalIban change) already resolved.
// personalIban comes from usePersonalIban() (not useAppParams).

const mockReceiveFor = jest.fn();
const mockUseAppParams = jest.fn();
const mockPersonalIban = jest.fn();

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
    currencies: [{ name: 'EUR' }],
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

jest.mock('src/components/payment/payment-info-buy', () => {
  const React = require('react');
  return {
    PaymentInformationContent: ({ info }: any) => <div data-testid="payment-info">{info.amount}</div>,
  };
});
jest.mock('src/components/error-hint', () => ({ ErrorHint: () => null }));
jest.mock('src/components/payment/buy-completion', () => ({ BuyCompletion: () => null }));
jest.mock('src/components/quote-error-hint', () => ({ QuoteErrorHint: () => null }));

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

import { act, render, screen, waitFor } from '@testing-library/react';
import BuyInfoScreen from 'src/screens/buy-info.screen';

function baseAppParams(overrides: Record<string, unknown> = {}) {
  return {
    assetIn: 'EUR',
    assetOut: 'BTC',
    amountIn: '100',
    amountOut: undefined,
    externalTransactionId: undefined,
    availableBlockchains: undefined,
    ...overrides,
  };
}

describe('BuyInfoScreen quote race protection', () => {
  it('discards a stale, slower-resolving quote in favor of a newer, faster one', async () => {
    mockPersonalIban.mockReturnValue(undefined);
    mockUseAppParams.mockReturnValue(baseAppParams());

    function offerFor(provider: string | undefined) {
      return {
        id: provider === undefined ? 1 : 2,
        amount: provider === undefined ? 111 : 222,
        currency: { name: 'EUR' },
        estimatedAmount: 0.01,
        asset: { name: 'BTC' },
        minVolume: 1,
        maxVolume: 10000,
      };
    }

    mockReceiveFor.mockImplementation((req: any) => {
      const provider = req.personalIbanProvider;
      const delay = provider === undefined ? 250 : 0;
      return new Promise((resolve) => setTimeout(() => resolve(offerFor(provider)), delay));
    });

    const { rerender } = render(<BuyInfoScreen />);

    await waitFor(() => expect(mockReceiveFor).toHaveBeenCalled());
    expect(mockReceiveFor.mock.calls[0][0].personalIbanProvider).toBeUndefined();

    mockPersonalIban.mockReturnValue('frick');
    rerender(<BuyInfoScreen />);

    await waitFor(() =>
      expect(mockReceiveFor.mock.calls.some((c: any) => c[0].personalIbanProvider === 'Frick')).toBe(true),
    );

    await waitFor(() => expect(screen.getByTestId('payment-info')).toHaveTextContent('222'));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });

    expect(screen.getByTestId('payment-info')).toHaveTextContent('222');
    expect(screen.queryByText('111')).not.toBeInTheDocument();
  });
});
