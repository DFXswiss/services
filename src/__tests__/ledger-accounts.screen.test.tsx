import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LedgerAccountsResponseDto } from 'src/dto/ledger.dto';

const mockUseAdminGuard = jest.fn();
const mockUseLayoutOptions = jest.fn();
const mockNavigate = jest.fn();
const mockGetAccounts = jest.fn<Promise<LedgerAccountsResponseDto>, [string?, string?]>();
let mockIsLoggedIn = true;

jest.mock('@dfx.swiss/react', () => ({
  useSessionContext: () => ({ isLoggedIn: mockIsLoggedIn }),
}));

jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { LG: 'lg', SM: 'sm' },
  StyledLoadingSpinner: () => <div data-testid="loading-spinner" />,
}));

jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({ translate: (_scope: string, key: string) => key }),
}));

jest.mock('src/hooks/guard.hook', () => ({ useAdminGuard: () => mockUseAdminGuard() }));
jest.mock('src/hooks/layout-config.hook', () => ({ useLayoutOptions: (opts: unknown) => mockUseLayoutOptions(opts) }));
jest.mock('src/hooks/navigation.hook', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('src/hooks/ledger.hook', () => ({ useLedger: () => ({ getAccounts: mockGetAccounts }) }));

import LedgerAccountsScreen from 'src/screens/ledger-accounts.screen';

const response: LedgerAccountsResponseDto = {
  period: { from: '2026-01-01', to: '2026-06-01' },
  accounts: [
    { accountId: 1, name: 'Bank CHF', type: 'Asset', currency: 'CHF', balanceNative: 100000, balanceChf: 100000 },
  ],
};

describe('LedgerAccountsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoggedIn = true;
  });

  it('invokes the admin guard and registers the Accounts layout with a back button', () => {
    mockGetAccounts.mockReturnValue(new Promise(() => undefined));
    render(<LedgerAccountsScreen />);
    expect(mockUseAdminGuard).toHaveBeenCalledTimes(1);
    expect(mockUseLayoutOptions).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Accounts', backButton: true }),
    );
  });

  it('shows the spinner during the initial load', () => {
    mockGetAccounts.mockReturnValue(new Promise(() => undefined));
    render(<LedgerAccountsScreen />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('loads with no date filters on mount', async () => {
    mockGetAccounts.mockResolvedValue(response);
    render(<LedgerAccountsScreen />);
    await screen.findByText('Bank CHF');
    expect(mockGetAccounts).toHaveBeenCalledWith(undefined, undefined);
  });

  it('renders the period range once data has loaded', async () => {
    mockGetAccounts.mockResolvedValue(response);
    render(<LedgerAccountsScreen />);
    await screen.findByText('Bank CHF');
    expect(screen.getByText(/2026-01-01/)).toBeInTheDocument();
    expect(screen.getByText(/2026-06-01/)).toBeInTheDocument();
  });

  it('does not fetch when the user is not logged in', () => {
    mockIsLoggedIn = false;
    mockGetAccounts.mockReturnValue(new Promise(() => undefined));
    render(<LedgerAccountsScreen />);
    expect(mockGetAccounts).not.toHaveBeenCalled();
  });

  it('reloads with the chosen from/to range when Apply is clicked', async () => {
    mockGetAccounts.mockResolvedValue(response);
    render(<LedgerAccountsScreen />);
    await screen.findByText('Bank CHF');

    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-02-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-03-01' } });
    fireEvent.click(screen.getByText('Apply'));

    await waitFor(() => expect(mockGetAccounts).toHaveBeenCalledWith('2026-02-01', '2026-03-01'));
  });

  it('passes undefined for empty date fields on Apply', async () => {
    mockGetAccounts.mockResolvedValue(response);
    render(<LedgerAccountsScreen />);
    await screen.findByText('Bank CHF');
    mockGetAccounts.mockClear();

    fireEvent.click(screen.getByText('Apply'));
    // Empty strings are normalized to undefined so the API receives no spurious filter.
    await waitFor(() => expect(mockGetAccounts).toHaveBeenCalledWith(undefined, undefined));
  });

  it('shows the error message when loading fails', async () => {
    mockGetAccounts.mockRejectedValue(new Error('nope'));
    render(<LedgerAccountsScreen />);
    expect(await screen.findByText('Failed to load data')).toBeInTheDocument();
  });

  it('navigates to the account detail on row click', async () => {
    mockGetAccounts.mockResolvedValue(response);
    render(<LedgerAccountsScreen />);
    fireEvent.click(await screen.findByText('Bank CHF'));
    expect(mockNavigate).toHaveBeenCalledWith('/ledger/accounts/1');
  });
});
