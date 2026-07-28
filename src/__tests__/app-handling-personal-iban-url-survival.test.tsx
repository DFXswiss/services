// Regression guard: `personal-iban` is deliberately NOT in app-handling.context.tsx's
// urlParamsToRemove list (see the comment above that list) — it is the durable, public
// selector and must survive the initial address-bar cleanup that strips one-shot
// auth/session/PII/config params after init. This test proves that property against the
// REAL removeUrlParams behavior (not a copy of the list), by rendering the real
// AppHandlingContextProvider with a URL that mixes personal-iban with a param that
// legitimately gets stripped (`address`), so the pass only holds if the stripping logic
// genuinely ran and selectively spared personal-iban — not merely because nothing in the
// URL triggered the strip pass at all.

const mockNavigate = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  Blockchain: {},
  useAuthContext: () => ({ session: undefined }),
  useSessionContext: () => ({ isInitialized: true, isLoggedIn: false, availableBlockchains: [] }),
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

describe('personal-iban survives the initial address-bar cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('strips a removable param (address) but keeps personal-iban, in both the router navigation and the real URL', async () => {
    window.history.pushState({}, '', '/buy?personal-iban=frick&address=abc123');

    await act(async () => {
      render(
        <AppHandlingContextProvider isWidget={false} router={fakeRouter('/buy')}>
          <div>probe</div>
        </AppHandlingContextProvider>,
      );
    });

    // removeUrlParams only runs its strip pass when at least one listed param is present —
    // `address` is in urlParamsToRemove, so this exercises the real list, not a no-op.
    expect(mockNavigate).toHaveBeenCalled();
    const navigatedTo = mockNavigate.mock.calls[0][0] as string;
    expect(navigatedTo).toContain('personal-iban=frick');
    expect(navigatedTo).not.toContain('address=');

    // The same cleanup also rewrites the real address bar (history.replaceState) — assert
    // the property end-to-end, not just the router.navigate call argument.
    expect(window.location.search).toContain('personal-iban=frick');
    expect(window.location.search).not.toContain('address=');
  });

  it('does nothing when personal-iban is the ONLY param present (nothing removable to trigger the strip pass)', async () => {
    window.history.pushState({}, '', '/buy?personal-iban=frick');

    await act(async () => {
      render(
        <AppHandlingContextProvider isWidget={false} router={fakeRouter('/buy')}>
          <div>probe</div>
        </AppHandlingContextProvider>,
      );
    });

    // No removable param present -> removeUrlParams short-circuits -> no navigate call.
    // This documents the early-return branch so the FIRST test's proof (selective survival
    // alongside a genuinely-stripped param) is understood as the meaningful one.
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(window.location.search).toContain('personal-iban=frick');
  });
});
