// SettingsScreen verification-call: preferred times visible without prior consent;
// each field still saves independently; failed saves surface ErrorHint under that field
// and roll the form value back to the server so the same choice can be retried.

const mockUpdateCallSettings = jest.fn();
const mockUser = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  PhoneCallStatus: {
    COMPLETED: 'Completed',
    FAILED: 'Failed',
    UNAVAILABLE: 'Unavailable',
  },
  PhoneCallTime: {
    H_9_TO_10: 'H9To10',
    H_10_TO_11: 'H10To11',
    H_9_TO_16: 'H9To16',
  },
  Utils: {
    formatIban: (iban: string) => iban,
  },
  useBankAccountContext: () => ({
    bankAccounts: [],
    updateAccount: jest.fn(),
    isLoading: false,
  }),
  useFiatContext: () => ({
    currencies: [{ id: 2, name: 'EUR' }],
  }),
  useUserContext: () => ({
    user: mockUser(),
    isUserLoading: false,
    userAddresses: [],
    updateCallSettings: mockUpdateCallSettings,
    deleteAddress: jest.fn(),
    deleteAccount: jest.fn(),
    renameAddress: jest.fn(),
  }),
}));

jest.mock('@dfx.swiss/react-components', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Controller } = require('react-hook-form');

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
    Form: ({ children, control }: any) => <div>{enrich(children, control)}</div>,
    SpinnerSize: { LG: 'lg' },
    StyledButton: ({ label, onClick, isLoading }: any) => (
      <button type="button" onClick={onClick} disabled={isLoading}>
        {label}
      </button>
    ),
    StyledButtonColor: { STURDY_WHITE: 'sturdy-white', GRAY_OUTLINE: 'gray' },
    StyledButtonWidth: { FULL: 'full' },
    StyledDropdown: ({ name, items, labelFunc, label, control }: any) => (
      <Controller
        name={name}
        control={control}
        render={({ field }: any) => (
          <div data-testid={`dropdown-${name}`}>
            {label && <label>{label}</label>}
            <span data-testid={`dropdown-${name}-value`}>
              {field.value === undefined || field.value === null ? 'Select...' : labelFunc(field.value)}
            </span>
            {(items ?? []).map((item: any) => (
              <button
                key={String(labelFunc(item))}
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
    // Mirrors real multi-choice: deselecting the last item yields [].
    StyledDropdownMultiChoice: ({ name, items, labelFunc, label, control }: any) => (
      <Controller
        name={name}
        control={control}
        render={({ field }: any) => {
          const selected: any[] = field.value || [];
          return (
            <div data-testid={`dropdown-${name}`}>
              {label && <label>{label}</label>}
              <span data-testid={`dropdown-${name}-value`}>
                {selected.length === 0 ? 'Select...' : selected.map((i) => labelFunc(i)).join(', ')}
              </span>
              {(items ?? []).map((item: any) => (
                <button
                  key={String(labelFunc(item))}
                  type="button"
                  data-testid={`select-${name}-${labelFunc(item)}`}
                  onClick={() => {
                    const exists = selected.some((s) => JSON.stringify(s) === JSON.stringify(item));
                    field.onChange(
                      exists ? selected.filter((s) => JSON.stringify(s) !== JSON.stringify(item)) : [...selected, item],
                    );
                  }}
                >
                  {labelFunc(item)}
                </button>
              ))}
            </div>
          );
        }}
      />
    ),
    StyledHorizontalStack: ({ children }: any) => <div>{children}</div>,
    StyledLoadingSpinner: () => null,
    StyledVerticalStack: ({ children }: any) => <div>{children}</div>,
  };
});

jest.mock('copy-to-clipboard', () => () => true);
jest.mock('src/components/actionable-list', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('src/components/error-hint', () => ({
  ErrorHint: ({ message }: { message: string }) => <div data-testid="error-hint">{message}</div>,
}));
jest.mock('src/components/overlay/edit-bank-overlay', () => ({ EditBankAccount: () => null }));
jest.mock('src/components/overlay/edit-overlay', () => ({ EditOverlay: () => null }));
jest.mock('src/components/payment/add-bank-account', () => ({ AddBankAccount: () => null }));
jest.mock('src/config/labels', () => ({
  addressLabel: () => '',
  PhoneCallTimeLabels: {
    H9To10: '09:00 - 10:00',
    H10To11: '10:00 - 11:00',
    H9To16: '09:00 - 16:00',
  },
}));
jest.mock('src/contexts/layout.context', () => ({
  useLayoutContext: () => ({ rootRef: { current: null } }),
}));
jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({
    translate: (_ns: string, key: string) => key,
    language: { id: 1, name: 'English', symbol: 'EN' },
    currency: { id: 2, name: 'EUR' },
    availableLanguages: [{ id: 1, name: 'English', symbol: 'EN', foreignName: 'English' }],
    changeLanguage: jest.fn(),
    changeCurrency: jest.fn(),
  }),
}));
jest.mock('src/contexts/wallet.context', () => ({
  useWalletContext: () => ({ setWallet: jest.fn() }),
}));
jest.mock('src/contexts/window.context', () => ({
  useWindowContext: () => ({ width: 800 }),
}));
jest.mock('src/hooks/anchor.hook', () => ({ useAnchor: jest.fn() }));
jest.mock('src/hooks/guard.hook', () => ({ useUserGuard: jest.fn() }));
jest.mock('src/hooks/layout-config.hook', () => ({ useLayoutOptions: jest.fn() }));
jest.mock('src/hooks/navigation.hook', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('src/util/utils', () => ({
  blankedAddress: (a: string) => a,
  sortAddressesByBlockchain: () => 0,
}));

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PhoneCallTime } from '@dfx.swiss/react';
import SettingsScreen from 'src/screens/settings.screen';

/** useApi().call throws ApiException which extends Error — not a plain object. */
function apiError(message: string): Error {
  return new Error(message);
}

function firstCustomerUser(overrides: Record<string, unknown> = {}) {
  const kycOverride = (overrides.kyc as object) ?? {};
  return {
    disabledAddresses: [],
    activeAddress: undefined,
    ...overrides,
    kyc: {
      phoneCallAccepted: null,
      // v2 always returns an array (empty when none chosen) — never undefined.
      preferredPhoneTimes: [],
      phoneCallStatus: undefined,
      ...kycOverride,
    },
  };
}

describe('SettingsScreen preferred call time visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.mockReturnValue(firstCustomerUser());
    mockUpdateCallSettings.mockResolvedValue(undefined);
  });

  it('shows preferred call time for a first-time customer without prior consent', () => {
    render(<SettingsScreen />);

    expect(screen.getByText('Verification Call')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-preferredPhoneTimes')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-preferredPhoneTimes-value')).toHaveTextContent('Select...');
  });

  it('selecting a time sends only preferredPhoneTimes (no acceptCall)', async () => {
    render(<SettingsScreen />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-preferredPhoneTimes-09:00 - 10:00'));
    });

    await waitFor(() => expect(mockUpdateCallSettings).toHaveBeenCalledTimes(1));
    expect(mockUpdateCallSettings).toHaveBeenCalledWith([PhoneCallTime.H_9_TO_10]);
    expect(mockUpdateCallSettings.mock.calls[0]).toHaveLength(1);
  });

  it('selecting No sends acceptCall false only', async () => {
    mockUser.mockReturnValue(
      firstCustomerUser({
        kyc: { phoneCallAccepted: true, preferredPhoneTimes: [PhoneCallTime.H_9_TO_10] },
      }),
    );

    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-acceptCall-value')).toHaveTextContent('Yes, call me');
    });

    mockUpdateCallSettings.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByTestId("select-acceptCall-No, don't call me"));
    });

    await waitFor(() => expect(mockUpdateCallSettings).toHaveBeenCalledTimes(1));
    expect(mockUpdateCallSettings).toHaveBeenCalledWith(undefined, false);
  });

  it('shows preferred-time error under the time field when save fails', async () => {
    mockUpdateCallSettings.mockRejectedValueOnce(apiError('Phone call status is already set'));

    render(<SettingsScreen />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-preferredPhoneTimes-09:00 - 10:00'));
    });

    await waitFor(() => {
      expect(within(screen.getByTestId('preferred-phone-times-error')).getByTestId('error-hint')).toHaveTextContent(
        'Phone call status is already set',
      );
    });
    expect(screen.queryByTestId('accept-call-error')).not.toBeInTheDocument();
  });

  it('shows acceptCall error under the consent field when save fails', async () => {
    mockUpdateCallSettings.mockRejectedValueOnce(apiError('Consent update rejected'));

    render(<SettingsScreen />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("select-acceptCall-No, don't call me"));
    });

    await waitFor(() => {
      expect(within(screen.getByTestId('accept-call-error')).getByTestId('error-hint')).toHaveTextContent(
        'Consent update rejected',
      );
    });
    expect(screen.queryByTestId('preferred-phone-times-error')).not.toBeInTheDocument();
  });

  it('keeps the acceptCall error when a later preferred-time save succeeds', async () => {
    mockUpdateCallSettings.mockRejectedValueOnce(apiError('Consent update rejected')).mockResolvedValueOnce(undefined);

    render(<SettingsScreen />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("select-acceptCall-No, don't call me"));
    });

    await waitFor(() => {
      expect(within(screen.getByTestId('accept-call-error')).getByTestId('error-hint')).toHaveTextContent(
        'Consent update rejected',
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-preferredPhoneTimes-09:00 - 10:00'));
    });

    await waitFor(() => expect(mockUpdateCallSettings).toHaveBeenCalledTimes(2));
    expect(mockUpdateCallSettings).toHaveBeenNthCalledWith(2, [PhoneCallTime.H_9_TO_10]);

    expect(within(screen.getByTestId('accept-call-error')).getByTestId('error-hint')).toHaveTextContent(
      'Consent update rejected',
    );
    expect(screen.queryByTestId('preferred-phone-times-error')).not.toBeInTheDocument();
  });

  it('clears the preferred-time error after a successful retry on the same field', async () => {
    mockUpdateCallSettings
      .mockRejectedValueOnce(apiError('Phone call status is already set'))
      .mockResolvedValueOnce(undefined);

    render(<SettingsScreen />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-preferredPhoneTimes-09:00 - 10:00'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('preferred-phone-times-error')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-preferredPhoneTimes-10:00 - 11:00'));
    });

    await waitFor(() => expect(mockUpdateCallSettings).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(screen.queryByTestId('preferred-phone-times-error')).not.toBeInTheDocument();
    });
  });

  it('after a failed acceptCall save, the dropdown returns to the server value and shows the error', async () => {
    mockUser.mockReturnValue(
      firstCustomerUser({
        kyc: { phoneCallAccepted: true, preferredPhoneTimes: [] },
      }),
    );
    mockUpdateCallSettings.mockRejectedValueOnce(apiError('Consent update rejected'));

    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-acceptCall-value')).toHaveTextContent('Yes, call me');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("select-acceptCall-No, don't call me"));
    });

    await waitFor(() => {
      expect(within(screen.getByTestId('accept-call-error')).getByTestId('error-hint')).toHaveTextContent(
        'Consent update rejected',
      );
    });
    expect(screen.getByTestId('dropdown-acceptCall-value')).toHaveTextContent('Yes, call me');
  });

  it('after a failed acceptCall save, choosing the same option again sends another request', async () => {
    mockUser.mockReturnValue(
      firstCustomerUser({
        kyc: { phoneCallAccepted: true, preferredPhoneTimes: [] },
      }),
    );
    mockUpdateCallSettings
      .mockRejectedValueOnce(apiError('Consent update rejected'))
      .mockRejectedValueOnce(apiError('Consent update rejected'));

    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-acceptCall-value')).toHaveTextContent('Yes, call me');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("select-acceptCall-No, don't call me"));
    });

    await waitFor(() => expect(mockUpdateCallSettings).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByTestId('dropdown-acceptCall-value')).toHaveTextContent('Yes, call me');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("select-acceptCall-No, don't call me"));
    });

    await waitFor(() => expect(mockUpdateCallSettings).toHaveBeenCalledTimes(2));
    expect(mockUpdateCallSettings).toHaveBeenNthCalledWith(2, undefined, false);
  });

  it('after a failed preferred-time save, the dropdown returns to the server value and a retry sends another request', async () => {
    mockUpdateCallSettings
      .mockRejectedValueOnce(apiError('Phone call status is already set'))
      .mockRejectedValueOnce(apiError('Phone call status is already set'));

    render(<SettingsScreen />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-preferredPhoneTimes-09:00 - 10:00'));
    });

    await waitFor(() => expect(mockUpdateCallSettings).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(within(screen.getByTestId('preferred-phone-times-error')).getByTestId('error-hint')).toHaveTextContent(
        'Phone call status is already set',
      );
    });
    expect(screen.getByTestId('dropdown-preferredPhoneTimes-value')).toHaveTextContent('Select...');

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-preferredPhoneTimes-09:00 - 10:00'));
    });

    await waitFor(() => expect(mockUpdateCallSettings).toHaveBeenCalledTimes(2));
    expect(mockUpdateCallSettings).toHaveBeenNthCalledWith(2, [PhoneCallTime.H_9_TO_10]);
  });

  it('clears acceptCall error when the user starts another save on that field', async () => {
    // After rollback the form already shows the server value, so a new choice always
    // differs and enters the if — that is where the error is cleared (no outside-if sticky path).
    mockUser.mockReturnValue(
      firstCustomerUser({
        kyc: { phoneCallAccepted: true, preferredPhoneTimes: [] },
      }),
    );
    mockUpdateCallSettings
      .mockRejectedValueOnce(apiError('Consent update rejected'))
      .mockResolvedValueOnce(undefined);

    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-acceptCall-value')).toHaveTextContent('Yes, call me');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("select-acceptCall-No, don't call me"));
    });

    await waitFor(() => {
      expect(within(screen.getByTestId('accept-call-error')).getByTestId('error-hint')).toHaveTextContent(
        'Consent update rejected',
      );
    });
    expect(screen.getByTestId('dropdown-acceptCall-value')).toHaveTextContent('Yes, call me');

    await act(async () => {
      fireEvent.click(screen.getByTestId("select-acceptCall-No, don't call me"));
    });

    await waitFor(() => expect(mockUpdateCallSettings).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(screen.queryByTestId('accept-call-error')).not.toBeInTheDocument();
    });
  });
});
