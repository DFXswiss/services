const mockGetCountries = jest.fn();
const mockSetData = jest.fn();
const mockUseUserContext = jest.fn();
const mockUseAppParams = jest.fn();

const mockLanguage = { id: 1, symbol: 'EN' };

const switzerland = {
  id: 1,
  symbol: 'CH',
  name: 'Schweiz',
  locationAllowed: false,
  kycAllowed: true,
  nationalityAllowed: false,
  bankAllowed: false,
  cardAllowed: false,
  cryptoAllowed: false,
  kycOrganizationAllowed: false,
};

const unitedStates = {
  id: 2,
  symbol: 'US',
  name: 'Vereinigte Staaten',
  locationAllowed: false,
  kycAllowed: false,
  nationalityAllowed: false,
  bankAllowed: false,
  cardAllowed: false,
  cryptoAllowed: false,
  kycOrganizationAllowed: true,
};

jest.mock('@dfx.swiss/react', () => ({
  useCountry: () => ({ getCountries: mockGetCountries }),
  useFiatContext: () => ({ currencies: [] }),
  useKyc: () => ({ setData: mockSetData }),
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
  useAppParams: () => mockUseAppParams(),
}));

jest.mock('../hooks/store.hook', () => ({
  useStore: () => ({
    language: { get: jest.fn(), set: jest.fn() },
    infoBanner: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
  }),
}));

jest.mock('../contexts/app-handling.context', () => ({
  useAppHandlingContext: () => ({ isInitialized: true }),
}));

import { act, render, waitFor } from '@testing-library/react';
import { SettingsContextProvider } from '../contexts/settings.context';

function userContext() {
  return {
    user: { id: 1, mail: undefined, language: mockLanguage, currency: undefined, kyc: { hash: 'kyc-hash' } },
    updateLanguage: jest.fn(),
    updateMail: jest.fn(),
    updatePhone: jest.fn(),
    updateCurrency: jest.fn(),
  };
}

describe('SettingsContextProvider organization country prefill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCountries.mockResolvedValue([switzerland, unitedStates]);
    mockSetData.mockResolvedValue(undefined);
    mockUseUserContext.mockReturnValue(userContext());
  });

  async function submittedKycData(): Promise<{
    address: { country?: typeof switzerland };
    organizationAddress?: { country?: typeof switzerland | typeof unitedStates };
  }> {
    render(
      <SettingsContextProvider>
        <div>settings</div>
      </SettingsContextProvider>,
    );

    await waitFor(() => expect(mockSetData).toHaveBeenCalledTimes(1));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    return mockSetData.mock.calls[0][0];
  }

  it('takes the residence country from kycAllowed and the organization country from kycOrganizationAllowed', async () => {
    mockUseAppParams.mockReturnValue({
      accountType: 'Organization',
      country: 'Schweiz',
      organizationName: 'Muster AG',
      organizationCountry: 'Vereinigte Staaten',
      setParams: jest.fn(),
    });

    const data = await submittedKycData();

    expect(data.address.country).toBe(switzerland);
    expect(data.organizationAddress?.country).toBe(unitedStates);
  });

  it('leaves both countries empty when each URL country is outside its own list', async () => {
    mockUseAppParams.mockReturnValue({
      accountType: 'Organization',
      country: 'Vereinigte Staaten',
      organizationName: 'Muster AG',
      organizationCountry: 'Schweiz',
      setParams: jest.fn(),
    });

    const data = await submittedKycData();

    expect(data.address.country).toBeUndefined();
    expect(data.organizationAddress).toEqual(expect.objectContaining({ country: undefined }));
  });

  it('does not set organizationAddress when organizationName is missing and keeps a Swiss residence', async () => {
    mockUseAppParams.mockReturnValue({
      accountType: 'Organization',
      country: 'Schweiz',
      setParams: jest.fn(),
    });

    const data = await submittedKycData();

    expect(data.address.country).toBe(switzerland);
    expect(data.organizationAddress).toBeUndefined();
  });
});
