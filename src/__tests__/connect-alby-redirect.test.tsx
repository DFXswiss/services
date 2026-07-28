// Component-level: ConnectAlby merges redirectPath + current search into the Alby
// auth redirect's `redirect` query param via relativeUrl (personal-iban survival).

const mockEnable = jest.fn();
const mockSignMessage = jest.fn();
const mockIsInstalled = jest.fn();
const mockRedirectPath = jest.fn();
const mockAppParams = jest.fn();
const mockOnCancel = jest.fn();
const mockOnLogin = jest.fn();
const mockOnSwitch = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  Blockchain: { LIGHTNING: 'Lightning' },
  useAuthContext: () => ({ session: undefined }),
  useSessionContext: () => ({ logout: jest.fn() }),
}));

jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { SM: 'sm', LG: 'lg' },
  StyledButton: ({ label, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
  StyledButtonColor: { GRAY_OUTLINE: 'gray-outline' },
  StyledButtonWidth: { MIN: 'min' },
  StyledLoadingSpinner: () => null,
}));

jest.mock('../config/api', () => ({
  Api: { url: 'https://api.example.com', version: 'v1' },
}));

jest.mock('../contexts/app-handling.context', () => ({
  useAppHandlingContext: () => ({
    redirectPath: mockRedirectPath(),
    params: mockAppParams(),
  }),
}));

jest.mock('../contexts/settings.context', () => ({
  useSettingsContext: () => ({
    translate: (_ns: string, key: string) => key,
  }),
}));

jest.mock('../contexts/wallet.context', () => ({
  WalletType: { ALBY: 'Alby' },
  WalletBlockchains: { Alby: ['Lightning'] },
  supportsBlockchain: () => true,
  useWalletContext: () => ({
    login: jest.fn(),
    setSession: jest.fn(),
    switchBlockchain: jest.fn(),
    activeWallet: undefined,
  }),
}));

jest.mock('../hooks/wallets/alby.hook', () => ({
  useAlby: () => ({
    isInstalled: mockIsInstalled,
    enable: mockEnable,
    signMessage: mockSignMessage,
  }),
}));

jest.mock('../util/utils', () => {
  const actual = jest.requireActual('../util/utils');
  return {
    ...actual,
    delay: jest.fn(() => Promise.resolve()),
  };
});

import { act, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import ConnectAlby from '../components/home/wallet/connect-alby';
import { WalletType } from '../contexts/wallet.context';

describe('ConnectAlby login redirect', () => {
  let capturedLocation: string | undefined;
  let locationStub: { href: string; search: string; origin: string; pathname: string };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedLocation = undefined;
    mockIsInstalled.mockResolvedValue(true);
    mockEnable.mockResolvedValue({ node: { alias: 'getalby.com' } });
    mockAppParams.mockReturnValue({});
    mockOnCancel.mockClear();

    locationStub = {
      href: 'http://localhost/connect',
      search: '',
      origin: 'http://localhost',
      pathname: '/connect',
    };

    Object.defineProperty(window, 'location', {
      configurable: true,
      get() {
        return locationStub;
      },
      set(value: string) {
        capturedLocation = value;
      },
    });
  });

  function renderConnectAlby() {
    return render(
      <ConnectAlby
        rootRef={createRef<HTMLDivElement>()}
        wallet={WalletType.ALBY}
        blockchain={undefined}
        isConnect={false}
        onLogin={mockOnLogin}
        onCancel={mockOnCancel}
        onSwitch={mockOnSwitch}
      />,
    );
  }

  function getRedirectParamFromCapturedLocation(): string | null {
    expect(capturedLocation).toBeDefined();
    const albyUrl = new URL(capturedLocation as string);
    const redirectUri = albyUrl.searchParams.get('redirectUri');
    expect(redirectUri).toBeTruthy();
    const returnUrl = new URL(redirectUri as string);
    return returnUrl.searchParams.get('redirect');
  }

  it('includes personal-iban in the Alby redirect when redirectPath carries it', async () => {
    mockRedirectPath.mockReturnValue('/buy?personal-iban=frick');

    await act(async () => {
      renderConnectAlby();
    });

    await waitFor(() => expect(capturedLocation).toBeDefined());

    const redirect = getRedirectParamFromCapturedLocation();
    expect(redirect).toBeTruthy();
    expect(redirect).toContain('personal-iban=frick');
    expect(redirect?.startsWith('/buy')).toBe(true);
  });

  it('copies personal-iban from the live search when present, but no other query keys (A4)', async () => {
    mockRedirectPath.mockReturnValue('/buy');
    locationStub.search = '?user=alice@example.com&personal-iban=frick&arbitrary=value';
    locationStub.href = 'http://localhost/connect?user=alice@example.com&personal-iban=frick&arbitrary=value';

    await act(async () => {
      renderConnectAlby();
    });

    await waitFor(() => expect(capturedLocation).toBeDefined());

    const redirect = getRedirectParamFromCapturedLocation();
    expect(redirect).toContain('personal-iban=frick');
    expect(redirect).not.toContain('user=');
    expect(redirect).not.toContain('arbitrary=');
  });

  it('does not append a query string when redirectPath has no extra params', async () => {
    mockRedirectPath.mockReturnValue('/buy');
    locationStub.search = '';
    locationStub.href = 'http://localhost/connect';

    await act(async () => {
      renderConnectAlby();
    });

    await waitFor(() => expect(capturedLocation).toBeDefined());

    const redirect = getRedirectParamFromCapturedLocation();
    expect(redirect).toBe('/buy');
    expect(redirect).not.toContain('?');
  });
});
