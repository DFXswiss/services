const mockUpdateSession = jest.fn();
const mockLogout = jest.fn();
const mockReceiveQuote = jest.fn();
const mockAppHandling = jest.fn();

let mockCurrentSession: { account: number; address: string } | undefined;
let mockIsLoggedIn = true;

function jwtToken(payload: object): string {
  const encode = (value: object) =>
    window
      .btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

function sessionToken(account: number): string {
  return jwtToken({ account, exp: Math.floor(Date.now() / 1000) + 3600 });
}

jest.mock('@dfx.swiss/react', () => ({
  Blockchain: {},
  PersonalIbanProvider: { FRICK: 'Frick' },
  TransactionError: {
    PAYMENT_METHOD_NOT_ALLOWED: 'PaymentMethodNotAllowed',
    KYC_REQUIRED: 'KycRequired',
  },
  Utils: {
    isJwt: (value: string) => value.split('.').length === 3,
  },
  useApiSession: () => ({ updateSession: mockUpdateSession }),
  useAuth: () => ({ getSignMessage: jest.fn() }),
  useAuthContext: () => ({ session: mockCurrentSession }),
  useSessionContext: () => ({
    authenticate: jest.fn(),
    isInitialized: true,
    isLoggedIn: mockIsLoggedIn,
    logout: mockLogout,
  }),
  useUserContext: () => ({ addSpecialCode: jest.fn(), reloadUser: jest.fn() }),
}));

jest.mock('@dfx.swiss/react/dist/definitions/auth', () => ({
  AuthWalletType: {},
}));

jest.mock('browser-lang', () => () => 'en');

jest.mock('../contexts/app-handling.context', () => ({
  useAppHandlingContext: () => mockAppHandling(),
}));

jest.mock('../contexts/balance.context', () => ({
  useBalanceContext: () => ({ readBalances: jest.fn() }),
}));

jest.mock('../hooks/store.hook', () => ({
  useStore: () => ({
    activeWallet: {
      get: () => undefined,
      set: jest.fn(),
      remove: jest.fn(),
    },
  }),
}));

jest.mock('../hooks/wallets/metamask.hook', () => ({
  useMetaMask: () => ({ getWalletType: jest.fn() }),
  WalletType: {},
}));

import { act, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { WalletContextProvider, useWalletContext } from '../contexts/wallet.context';
import { usePersonalIbanIdentityBinding } from '../hooks/personal-iban.hook';

function CustomerQuoteProbe(): JSX.Element {
  const { isInitialized } = useWalletContext();
  const binding = usePersonalIbanIdentityBinding();

  useEffect(() => {
    if (isInitialized && mockCurrentSession) {
      binding.recordApplicationForCurrentCustomer();
      mockReceiveQuote({
        customer: mockCurrentSession.account,
        ...(binding.personalIban
          ? { personalIbanProvider: binding.personalIban }
          : {}),
      });
    }
  }, [binding.personalIban, binding.recordApplicationForCurrentCustomer, isInitialized]);

  return (
    <>
      <div data-testid="wallet-state">{isInitialized ? 'ready' : 'authenticating'}</div>
      <div data-testid="quote-selector">{binding.personalIban ?? 'absent'}</div>
    </>
  );
}

function renderWidget() {
  const router = createMemoryRouter([{ path: '*', element: <CustomerQuoteProbe /> }]);
  return {
    router,
    rendered: render(
      <WalletContextProvider router={router}>
        <RouterProvider router={router} />
      </WalletContextProvider>,
    ),
  };
}

describe('widget session initialization with a personal-IBAN selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockCurrentSession = { account: 101, address: 'customer-a' };
    mockIsLoggedIn = true;
    mockUpdateSession.mockImplementation((token: string) => {
      const payload = JSON.parse(window.atob(token.split('.')[1]));
      mockCurrentSession = { account: payload.account, address: `customer-${payload.account}` };
      mockIsLoggedIn = true;
    });
    mockLogout.mockImplementation(() => {
      mockCurrentSession = undefined;
      mockIsLoggedIn = false;
    });
  });

  it('waits for incoming customer B authentication, then applies and binds B selector', async () => {
    const customerBSession = sessionToken(102);
    localStorage.setItem('dfx.authenticationToken', sessionToken(101));
    mockAppHandling.mockReturnValue({
      isInitialized: true,
      isWidget: true,
      params: { session: customerBSession },
      widgetPersonalIban: 'frick',
    });

    renderWidget();

    await waitFor(() => expect(screen.getByTestId('wallet-state')).toHaveTextContent('ready'));
    await waitFor(() =>
      expect(mockReceiveQuote).toHaveBeenCalledWith({
        customer: 102,
        personalIbanProvider: 'Frick',
      }),
    );
    expect(mockReceiveQuote).not.toHaveBeenCalledWith(
      expect.objectContaining({ customer: 101 }),
    );
  });

  it.each([
    ['a malformed non-JWT session', 'malformed-session'],
    ['a JWT without a customer identity', jwtToken({ exp: Math.floor(Date.now() / 1000) + 3600 })],
  ])('logs out a persisted customer for %s and remains usable', async (_case, incomingSession) => {
    mockAppHandling.mockReturnValue({
      isInitialized: true,
      isWidget: true,
      params: { session: incomingSession },
      widgetPersonalIban: 'frick',
    });

    const { router, rendered } = renderWidget();

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('wallet-state')).toHaveTextContent('ready'));
    expect(mockUpdateSession).not.toHaveBeenCalled();
    expect(mockReceiveQuote).not.toHaveBeenCalled();
    expect(screen.getByTestId('quote-selector')).toHaveTextContent('Frick');

    // A later valid login can use the still-requested selector; no pending state survives.
    mockCurrentSession = { account: 103, address: 'customer-c' };
    mockIsLoggedIn = true;
    await act(async () => {
      rendered.rerender(
        <WalletContextProvider router={router}>
          <RouterProvider router={router} />
        </WalletContextProvider>,
      );
    });

    await waitFor(() =>
      expect(mockReceiveQuote).toHaveBeenCalledWith({
        customer: 103,
        personalIbanProvider: 'Frick',
      }),
    );
  });
});
