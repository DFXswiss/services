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

import { act, fireEvent, render, screen } from '@testing-library/react';
import { AdminHoldersResponse, PaginationDirection } from 'src/dto/realunit.dto';
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

const FIRST_PAGE: AdminHoldersResponse = {
  holders: [
    {
      address: '0xabc0000000000000000000000000000000008101',
      balance: '10',
      percentage: 1,
      userData: { id: 1, verifiedName: 'First' },
    },
  ],
  pageInfo: {
    hasNextPage: true,
    hasPreviousPage: true,
    startCursor: 's',
    endCursor: 'e',
  },
  totalCount: 1,
};

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
} {
  let resolve: (value: T) => void = () => {
    throw new Error('deferred not initialized');
  };
  let reject: (reason: Error) => void = () => {
    throw new Error('deferred not initialized');
  };
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function holderPage(verifiedName: string, address: string, totalCount: number): AdminHoldersResponse {
  return {
    holders: [
      {
        address,
        balance: '10',
        percentage: 1,
        userData: { id: 1, verifiedName },
      },
    ],
    pageInfo: EMPTY_PAGE,
    totalCount,
  };
}

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

  it('keeps the later holder when a slower next response resolves afterwards', async () => {
    const nextPage = deferred<AdminHoldersResponse>();
    const previousPage = deferred<AdminHoldersResponse>();
    mockGetAdminHolders.mockImplementation((_cursor?: string, direction?: PaginationDirection) => {
      if (direction === PaginationDirection.NEXT) return nextPage.promise;
      if (direction === PaginationDirection.PREV) return previousPage.promise;
      return Promise.resolve(FIRST_PAGE);
    });

    render(<RealunitHoldersScreen />);
    expect(await screen.findByText('First')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await act(async () => {
      previousPage.resolve(holderPage('Later', '0xabc0000000000000000000000000000000008102', 3));
    });

    expect(screen.getByText('Later')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'All Holders (3)' })).toBeInTheDocument();

    await act(async () => {
      nextPage.resolve(holderPage('Stale', '0xabc0000000000000000000000000000000008103', 99));
    });
    expect(screen.getByText('Later')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'All Holders (3)' })).toBeInTheDocument();
    expect(screen.queryByText('Stale')).not.toBeInTheDocument();
  });

  it('keeps the load error when a slower next response resolves afterwards', async () => {
    const nextPage = deferred<AdminHoldersResponse>();
    const previousPage = deferred<AdminHoldersResponse>();
    mockGetAdminHolders.mockImplementation((_cursor?: string, direction?: PaginationDirection) => {
      if (direction === PaginationDirection.NEXT) return nextPage.promise;
      if (direction === PaginationDirection.PREV) return previousPage.promise;
      return Promise.resolve(FIRST_PAGE);
    });

    render(<RealunitHoldersScreen />);
    expect(await screen.findByText('First')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await act(async () => {
      previousPage.reject(new Error('unavailable'));
    });

    expect(await screen.findByText('Failed to load holders.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'All Holders (0)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    await act(async () => {
      nextPage.resolve(holderPage('Stale', '0xabc0000000000000000000000000000000008103', 99));
    });
    expect(screen.getByText('Failed to load holders.')).toBeInTheDocument();
    expect(screen.queryByText('Stale')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
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
