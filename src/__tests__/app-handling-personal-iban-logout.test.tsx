// B2: on a genuine logged-in → logged-out transition, personal-iban must be stripped from
// the browser URL so the next customer does not inherit the prior selector. Initial
// unauthenticated setup must still leave personal-iban alone (A4 login redirect survival).

const mockNavigate = jest.fn();
const mockUseSessionContext = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  Blockchain: {},
  useSessionContext: () => mockUseSessionContext(),
}));

jest.mock('../contexts/balance.context', () => ({
  useBalanceContext: () => ({ readBalances: jest.fn(), getBalances: () => [], hasBalance: false }),
}));

import { act, render } from '@testing-library/react';
import { Router } from '@remix-run/router';
import { AppHandlingContextProvider } from '../contexts/app-handling.context';

function fakeRouter(pathname: string): Router {
  return {
    state: { location: { pathname } },
    navigate: mockNavigate,
  } as unknown as Router;
}

describe('personal-iban logout cleanup (B2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('strips personal-iban from router and browser URL on logout', async () => {
    window.history.pushState({}, '', '/buy?personal-iban=frick&asset-in=EUR');
    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: true,
      availableBlockchains: [],
    });

    let rerender: (ui: React.ReactElement) => void;
    await act(async () => {
      const result = render(
        <AppHandlingContextProvider isWidget={false} router={fakeRouter('/buy')}>
          <div>probe</div>
        </AppHandlingContextProvider>,
      );
      rerender = result.rerender;
    });

    // Still logged in — personal-iban must remain.
    expect(window.location.search).toContain('personal-iban=frick');

    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: false,
      availableBlockchains: [],
    });

    await act(async () => {
      rerender!(
        <AppHandlingContextProvider isWidget={false} router={fakeRouter('/buy')}>
          <div>probe</div>
        </AppHandlingContextProvider>,
      );
    });

    expect(mockNavigate).toHaveBeenCalled();
    const navigatedTo = mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1][0] as string;
    expect(navigatedTo).not.toContain('personal-iban=');
    expect(window.location.search).not.toContain('personal-iban=');
  });

  it('does not strip personal-iban during initial unauthenticated setup', async () => {
    window.history.pushState({}, '', '/buy?personal-iban=frick');
    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: false,
      availableBlockchains: [],
    });

    await act(async () => {
      render(
        <AppHandlingContextProvider isWidget={false} router={fakeRouter('/buy')}>
          <div>probe</div>
        </AppHandlingContextProvider>,
      );
    });

    expect(window.location.search).toContain('personal-iban=frick');
  });
});
