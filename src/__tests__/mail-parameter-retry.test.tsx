const mockUpdateUserMail = jest.fn();
const mockUseUserContext = jest.fn();

const mockLanguage = { id: 1, symbol: 'EN' };

jest.mock('@dfx.swiss/react', () => ({
  useCountry: () => ({ getCountries: () => Promise.resolve([]) }),
  useFiatContext: () => ({ currencies: [] }),
  useKyc: () => ({ setData: jest.fn() }),
  useLanguage: () => ({ getDefaultLanguage: (languages: any[]) => languages[0] }),
  useLanguageContext: () => ({ languages: [mockLanguage] }),
  useSettings: () => ({ getInfoBanner: () => Promise.resolve(undefined) }),
  useUserContext: () => mockUseUserContext(),
}));

jest.mock('browser-lang', () => () => 'en');
jest.mock('i18next', () => ({ changeLanguage: jest.fn() }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, defaultValue: string) => defaultValue }),
}));

jest.mock('../hooks/app-params.hook', () => ({
  useAppParams: () => ({
    mail: '  User@Example.COM ',
    setParams: jest.fn(),
  }),
}));

jest.mock('../hooks/store.hook', () => ({
  useStore: () => ({
    language: { get: jest.fn(), set: jest.fn() },
    infoBanner: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
  }),
}));

jest.mock('../contexts/app-handling.context', () => ({
  useAppHandlingContext: () => ({ isInitialized: false }),
}));

import { act, render, waitFor } from '@testing-library/react';
import { SettingsContextProvider } from '../contexts/settings.context';

function user(id: number) {
  return { id, mail: undefined, language: mockLanguage, currency: undefined, kyc: {} };
}

function userContext(currentUser: ReturnType<typeof user>) {
  return {
    user: currentUser,
    updateLanguage: jest.fn(),
    updateMail: mockUpdateUserMail,
    updatePhone: jest.fn(),
    updateCurrency: jest.fn(),
  };
}

describe('SettingsContextProvider mail parameter retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockUseUserContext.mockReturnValue(userContext(user(1)));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function renderAndRerenderWithNewUser() {
    const view = render(
      <SettingsContextProvider>
        <div>settings</div>
      </SettingsContextProvider>,
    );

    await waitFor(() => expect(mockUpdateUserMail).toHaveBeenCalledTimes(1));
    await act(async () => {
      await Promise.resolve();
    });

    mockUseUserContext.mockReturnValue(userContext(user(2)));
    view.rerender(
      <SettingsContextProvider>
        <div>settings</div>
      </SettingsContextProvider>,
    );

    return view;
  }

  it('retries the normalized parameter after a transient rate-limit error', async () => {
    mockUpdateUserMail.mockRejectedValueOnce({ statusCode: 429 }).mockResolvedValue(undefined);

    await renderAndRerenderWithNewUser();

    await waitFor(() => expect(mockUpdateUserMail).toHaveBeenCalledTimes(2));
    expect(mockUpdateUserMail).toHaveBeenNthCalledWith(1, 'user@example.com');
    expect(mockUpdateUserMail).toHaveBeenNthCalledWith(2, 'user@example.com');
    expect(console.error).toHaveBeenCalledWith('Failed to apply the mail parameter:', { statusCode: 429 });
  });

  it('keeps a permanently rejected parameter guarded', async () => {
    mockUpdateUserMail.mockRejectedValueOnce({ statusCode: 400 });

    await renderAndRerenderWithNewUser();

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockUpdateUserMail).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('Failed to apply the mail parameter:', { statusCode: 400 });
  });

  it('keeps a successful parameter guarded', async () => {
    const successfulSubmit = Promise.resolve();
    const catchSpy = jest.spyOn(successfulSubmit, 'catch');
    mockUpdateUserMail.mockReturnValue(successfulSubmit);

    await renderAndRerenderWithNewUser();

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockUpdateUserMail).toHaveBeenCalledTimes(1);
    // The previous implementation ignored the returned promise entirely.
    expect(catchSpy).toHaveBeenCalledTimes(1);
  });
});
