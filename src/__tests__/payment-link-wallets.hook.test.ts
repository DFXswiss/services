jest.mock('@dfx.swiss/react', () => ({
  Blockchain: { LIGHTNING: 'Lightning', Ethereum: 'Ethereum' },
  PaymentLinkMode: { PUBLIC: 'Public' },
}));

jest.mock('src/dto/payment-link.dto', () => ({
  C2BPaymentMethod: { BINANCE_PAY: 'BinancePay', KUCOINPAY: 'KuCoinPay' },
}));

jest.mock('src/config/api', () => ({
  Api: { url: 'http://localhost', version: 'v1' },
}));

const mockUsePaymentLinkContext = jest.fn();

jest.mock('src/contexts/payment-link.context', () => ({
  usePaymentLinkContext: () => mockUsePaymentLinkContext(),
}));

import { renderHook, waitFor } from '@testing-library/react';
import { usePaymentLinkWallets } from '../hooks/payment-link-wallets.hook';
import { WalletInfo } from 'src/dto/payment-link.dto';

const LNURL = 'lnurl1dp68gurn8ghj7um9wfmxjcm99e3k7mf0v9cxj0m385ekvcenxc6r2c35xvukxefcv5mkvv34x5ekzd3ev56nyd3hxqurzepexejxxepnxscrvwfnv9nxzcn9xq6xyefhvgcxxcmmx4zkyvf5xq6ryvfev9jx2vfexgckyef5xq6x2efnxgcxxcmmx4zkyvf5xq6ryvfev9jx2';

const realUnitWallet = {
  id: 99,
  name: 'RealUnit',
  iconUrl: 'https://example.com/realunit.png',
  deepLink: 'realunit-wallet:',
  hasActionDeepLink: true,
  supportedMethods: ['Ethereum'],
  supportedAssets: [{ name: 'ZCHF', uniqueName: 'Ethereum:ZCHF' }],
  active: true,
  recommended: false,
} as WalletInfo;

const cakeWallet = {
  id: 42,
  name: 'Cake Wallet',
  iconUrl: 'https://example.com/cake.png',
  deepLink: 'cakewallet:',
  supportedMethods: ['Bitcoin'],
  active: true,
  recommended: false,
} as WalletInfo;

describe('usePaymentLinkWallets', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockUsePaymentLinkContext.mockReturnValue({
      paymentIdentifier: `https://pay.example.com/?lightning=${LNURL}`,
      payRequest: undefined,
      paymentHasQuote: () => false,
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [realUnitWallet],
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('exposes hasActionDeepLink for RealUnit and builds a lightning LNURL deeplink', async () => {
    const { result } = renderHook(() => usePaymentLinkWallets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const wallet = result.current.otherWallets.find((w) => w.name === 'RealUnit');
    expect(wallet).toBeDefined();
    expect(wallet?.hasActionDeepLink).toBe(true);

    const deeplink = await result.current.getDeeplinkByWalletId(99);
    expect(deeplink).toBe(`realunit-wallet:lightning:${LNURL}`);
  });

  it('does not expose hasActionDeepLink for non-Lightning wallets without the backend flag', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [cakeWallet],
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => usePaymentLinkWallets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const wallet = result.current.otherWallets.find((w) => w.id === 42);
    expect(wallet).toBeDefined();
    expect(wallet?.hasActionDeepLink).toBe(false);

    const deeplink = await result.current.getDeeplinkByWalletId(42);
    expect(deeplink).toBe('cakewallet:');
  });
});
