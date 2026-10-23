const mockUseRealunitGuard = jest.fn();
const mockGetAdminHolders = jest.fn();
const mockNavigate = jest.fn();
const mockCopy = jest.fn();

jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { SM: 'sm', MD: 'md', LG: 'lg' },
  IconColor: { GRAY: 'gray' },
  StyledLoadingSpinner: ({ size }: { size?: string }) => <div data-testid="loading-spinner" data-size={size} />,
  StyledButton: ({ label, onClick, disabled }: { label: string; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {label}
    </button>
  ),
  StyledButtonWidth: { MIN: 'min' },
  CopyButton: ({ onCopy }: { onCopy?: () => void }) => (
    <button type="button" data-testid="copy-button" onClick={onCopy}>
      copy
    </button>
  ),
}));

jest.mock('src/hooks/guard.hook', () => ({
  useRealunitGuard: (...args: unknown[]) => mockUseRealunitGuard(...args),
}));

jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({ translate: (_ns: string, key: string) => key }),
}));

jest.mock('src/hooks/layout-config.hook', () => ({
  useLayoutOptions: () => undefined,
}));

jest.mock('src/hooks/navigation.hook', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('src/hooks/clipboard.hook', () => ({
  useClipboard: () => ({ copy: mockCopy }),
}));

jest.mock('src/hooks/realunit-api.hook', () => ({
  useRealunitApi: () => ({ getAdminHolders: mockGetAdminHolders }),
}));

jest.mock('src/util/utils', () => ({
  blankedAddress: (address: string) => address,
}));

import { fireEvent, render, screen } from '@testing-library/react';
import { PaginationDirection } from 'src/dto/realunit.dto';
import RealunitHoldersScreen from 'src/screens/realunit-holders.screen';

const EMPTY_PAGE = {
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: '',
  endCursor: '',
};

const NAMED = {
  address: '0xabc0000000000000000000000000000000008001',
  balance: '100',
  percentage: 1.5,
  userData: { id: 7, verifiedName: 'Verified Ada', mail: 'ada@example.com' },
};

const UNKNOWN = {
  address: '0xabc0000000000000000000000000000000008002',
  balance: '50',
  percentage: 0.5,
  userData: null,
};

describe('RealunitHoldersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAdminHolders.mockResolvedValue({
      holders: [NAMED, UNKNOWN],
      pageInfo: EMPTY_PAGE,
      totalCount: 2,
    });
  });

  it('shows the large spinner while the first page has no rows yet', () => {
    mockGetAdminHolders.mockImplementation(() => new Promise(() => undefined));
    render(<RealunitHoldersScreen />);
    expect(screen.getByTestId('loading-spinner')).toHaveAttribute('data-size', 'lg');
    expect(screen.queryByText('User data')).not.toBeInTheDocument();
    expect(mockUseRealunitGuard).toHaveBeenCalled();
  });

  it('shows User data, the holder name and mail, and an em dash when userData is null', async () => {
    render(<RealunitHoldersScreen />);
    expect(await screen.findByText('User data')).toBeInTheDocument();
    expect(screen.getByText('Verified Ada')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('\u2014')).toBeInTheDocument();
    expect(screen.queryByText('Failed to load holders.')).not.toBeInTheDocument();
    expect(mockGetAdminHolders).toHaveBeenCalled();
  });

  it('shows the table without the failure sentence when the request succeeds with zero holders', async () => {
    mockGetAdminHolders.mockResolvedValue({ holders: [], pageInfo: EMPTY_PAGE, totalCount: 0 });
    render(<RealunitHoldersScreen />);
    expect(await screen.findByRole('heading', { name: 'All Holders (0)' })).toBeInTheDocument();
    expect(screen.getByText('User data')).toBeInTheDocument();
    expect(screen.queryByText('Failed to load holders.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('shows Failed to load holders. when the request rejects and does not throw', async () => {
    mockGetAdminHolders.mockRejectedValue(new Error('unavailable'));
    expect(() => render(<RealunitHoldersScreen />)).not.toThrow();
    expect(await screen.findByText('Failed to load holders.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /All Holders/ })).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('Percentage')).toBeInTheDocument();
    expect(screen.getByText('User data')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.queryByText('Verified Ada')).not.toBeInTheDocument();
  });

  it('requests the next and previous page with the cursors from pageInfo', async () => {
    mockGetAdminHolders.mockResolvedValue({
      holders: [NAMED],
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: true,
        startCursor: 'start-cursor',
        endCursor: 'end-cursor',
      },
      totalCount: 8,
    });
    render(<RealunitHoldersScreen />);
    await screen.findByText('Verified Ada');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(mockGetAdminHolders).toHaveBeenLastCalledWith('end-cursor', PaginationDirection.NEXT);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(mockGetAdminHolders).toHaveBeenLastCalledWith('start-cursor', PaginationDirection.PREV);
  });

  it('navigates to the holder and copies the address', async () => {
    render(<RealunitHoldersScreen />);
    fireEvent.click(await screen.findByText(NAMED.address));
    expect(mockNavigate).toHaveBeenCalledWith(`/realunit/user/${encodeURIComponent(NAMED.address)}`);
    fireEvent.click(screen.getAllByTestId('copy-button')[0]);
    expect(mockCopy).toHaveBeenCalledWith(NAMED.address);
  });
});
