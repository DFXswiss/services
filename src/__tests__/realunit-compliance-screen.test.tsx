// Component tests for the RealUnit compliance customer list screen: default empty-account filter,
// toggle, search bypass, and empty-state messages. Heavy transitive deps are mocked so the screen
// can render under @testing-library/react without the full app shell.

jest.mock('@dfx.swiss/react', () => ({}));
jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { SM: 'sm', LG: 'lg' },
  StyledLoadingSpinner: () => null,
}));
jest.mock('src/components/error-hint', () => ({ ErrorHint: () => null }));
jest.mock('src/hooks/guard.hook', () => ({
  useRealunitGuard: () => undefined,
}));
jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({ translate: (_ns: string, key: string) => key }),
}));
jest.mock('src/hooks/layout-config.hook', () => ({
  useLayoutOptions: () => undefined,
}));

const mockNavigate = jest.fn();
jest.mock('src/hooks/navigation.hook', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockSearchCustomers = jest.fn();
jest.mock('src/hooks/realunit-compliance.hook', () => ({
  useRealunitCompliance: () => ({ searchCustomers: mockSearchCustomers }),
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RealunitComplianceScreen from 'src/screens/realunit-compliance.screen';

const FULL = {
  id: 1,
  kycStatus: 'Completed',
  kycLevel: '50',
  name: 'Alice Muster',
  mail: 'a@b.ch',
  balance: 3,
};

const EMPTY = {
  id: 2,
  kycStatus: 'NA',
  kycLevel: '0',
  balance: 0,
};

describe('RealunitComplianceScreen empty-account filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters empty accounts in the default view and shows the toggle with the empty count', async () => {
    mockSearchCustomers.mockResolvedValue([FULL, EMPTY]);
    render(<RealunitComplianceScreen />);

    await waitFor(() => {
      expect(screen.getByText('Alice Muster')).toBeInTheDocument();
    });

    expect(screen.queryByRole('cell', { name: '2' })).not.toBeInTheDocument();
    expect(screen.getByText(/Customers/)).toHaveTextContent('Customers: 2');
    expect(screen.getByText(/Hide empty accounts/)).toHaveTextContent('Hide empty accounts (1)');
  });

  it('shows empty accounts when the hide toggle is turned off', async () => {
    mockSearchCustomers.mockResolvedValue([FULL, EMPTY]);
    render(<RealunitComplianceScreen />);

    await waitFor(() => {
      expect(screen.getByText('Alice Muster')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(screen.getByRole('cell', { name: '2' })).toBeInTheDocument();
    expect(screen.getByText('Alice Muster')).toBeInTheDocument();
  });

  it('bypasses the filter when a search is active and hides the toggle', async () => {
    mockSearchCustomers.mockResolvedValue([FULL, EMPTY]);
    render(<RealunitComplianceScreen />);

    await waitFor(() => {
      expect(screen.getByText('Alice Muster')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Search by ID, email, phone or name...');
    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockSearchCustomers).toHaveBeenCalledWith('x');
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Muster')).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: '2' })).toBeInTheDocument();
    });

    expect(screen.queryByText(/Hide empty accounts/)).not.toBeInTheDocument();
  });

  it('shows a dedicated message when every account is hidden by the filter', async () => {
    mockSearchCustomers.mockResolvedValue([EMPTY]);
    render(<RealunitComplianceScreen />);

    await waitFor(() => {
      expect(screen.getByText('All accounts are hidden by the filter above')).toBeInTheDocument();
    });

    expect(screen.queryByText('No entries found')).not.toBeInTheDocument();
  });

  it('shows the generic empty message and no toggle when the list is empty', async () => {
    mockSearchCustomers.mockResolvedValue([]);
    render(<RealunitComplianceScreen />);

    await waitFor(() => {
      expect(screen.getByText('No entries found')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Hide empty accounts/)).not.toBeInTheDocument();
  });
});
