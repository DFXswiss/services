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

import LedgerScreen from 'src/screens/ledger.screen';

const response: LedgerAccountsResponseDto = {
  period: { from: '2026-01-01T00:00:00.000Z', to: '2026-06-01T00:00:00.000Z' },
  accounts: [
    { accountId: 1, name: 'Bank CHF', type: 'Asset', currency: 'CHF', balanceNative: 100000, balanceChf: 100000, reconStatus: 'ok' },
    { accountId: 2, name: 'Customer Deposits', type: 'Liability', currency: 'CHF', balanceNative: -32000, balanceChf: -32000 },
  ],
};

describe('LedgerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoggedIn = true;
  });

  it('invokes the admin guard on render', () => {
    mockGetAccounts.mockReturnValue(new Promise(() => undefined));
    render(<LedgerScreen />);
    expect(mockUseAdminGuard).toHaveBeenCalledTimes(1);
  });

  it('registers the layout title', () => {
    mockGetAccounts.mockReturnValue(new Promise(() => undefined));
    render(<LedgerScreen />);
    expect(mockUseLayoutOptions).toHaveBeenCalledWith(expect.objectContaining({ title: 'Ledger', noMaxWidth: true }));
  });

  it('shows the loading spinner while the request is pending', () => {
    mockGetAccounts.mockReturnValue(new Promise(() => undefined));
    render(<LedgerScreen />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('does not call getAccounts when the user is not logged in', () => {
    mockIsLoggedIn = false;
    mockGetAccounts.mockReturnValue(new Promise(() => undefined));
    render(<LedgerScreen />);
    expect(mockGetAccounts).not.toHaveBeenCalled();
    // Still in the initial loading state because the effect bailed out before resolving.
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders the accounts table and summary cards on success', async () => {
    mockGetAccounts.mockResolvedValue(response);
    render(<LedgerScreen />);

    expect(await screen.findByText('Bank CHF')).toBeInTheDocument();
    expect(screen.getByText('Customer Deposits')).toBeInTheDocument();
    // Summary card labels.
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
    expect(screen.getByText('Net Equity')).toBeInTheDocument();
    // Net equity = 100'000 + (−32'000) = 68'000.00 (signed sum, not assets − liabilities = 132'000).
    // de-CH uses a non-'.' group separator; '.' in the regex is a wildcard, '\.' is the literal decimal point.
    expect(screen.getByText(/^68.000\.00$/)).toBeInTheDocument();
    expect(screen.queryByText(/^132.000\.00$/)).not.toBeInTheDocument();
  });

  it('displays liabilities as a positive magnitude in the summary card', async () => {
    mockGetAccounts.mockResolvedValue(response);
    render(<LedgerScreen />);
    await screen.findByText('Bank CHF');
    // -totalLiabilities of −32'000 is +32'000.00 in the Total Liabilities card.
    expect(screen.getByText(/^32.000\.00$/)).toBeInTheDocument();
  });

  it('navigates to the account detail when a row is clicked', async () => {
    mockGetAccounts.mockResolvedValue(response);
    render(<LedgerScreen />);
    fireEvent.click(await screen.findByText('Bank CHF'));
    expect(mockNavigate).toHaveBeenCalledWith('/ledger/accounts/1');
  });

  it('shows the error message when the request rejects', async () => {
    mockGetAccounts.mockRejectedValue(new Error('boom'));
    render(<LedgerScreen />);
    expect(await screen.findByText('Failed to load data')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('renders zero summary values for an empty account list', async () => {
    mockGetAccounts.mockResolvedValue({ period: response.period, accounts: [] });
    render(<LedgerScreen />);
    await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument());
    // All four summary cards show the dash/zero formatting; assets card => 0.00.
    expect(screen.getAllByText('0.00').length).toBeGreaterThan(0);
  });
});
