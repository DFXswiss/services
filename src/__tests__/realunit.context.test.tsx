import { act, renderHook, waitFor } from '@testing-library/react';
import { PropsWithChildren } from 'react';

const mockGetStats = jest.fn();

jest.mock('../hooks/realunit-api.hook', () => ({
  useRealunitApi: () => ({
    getAccountSummary: jest.fn(),
    getAccountHistory: jest.fn(),
    getHolders: jest.fn(),
    getPriceHistory: jest.fn(),
    getTokenInfo: jest.fn(),
    getTokenPrice: jest.fn(),
    getAdminQuotes: jest.fn(),
    getAdminTransactions: jest.fn(),
    confirmPayment: jest.fn(),
    getStats: mockGetStats,
  }),
}));

import { RealunitContextProvider, useRealunitContext } from '../contexts/realunit.context';
import { realunitStatsFixture } from '../test-fixtures/realunit-stats.fixture';

const wrapper = ({ children }: PropsWithChildren) => <RealunitContextProvider>{children}</RealunitContextProvider>;

describe('RealunitContext - fetchStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should expose undefined stats initially', () => {
    const { result } = renderHook(() => useRealunitContext(), { wrapper });
    expect(result.current.stats).toBeUndefined();
  });

  it('should populate stats after fetchStats resolves', async () => {
    mockGetStats.mockResolvedValueOnce(realunitStatsFixture);

    const { result } = renderHook(() => useRealunitContext(), { wrapper });

    act(() => {
      result.current.fetchStats();
    });

    await waitFor(() => expect(result.current.stats).toEqual(realunitStatsFixture));
    expect(mockGetStats).toHaveBeenCalledTimes(1);
  });
});
